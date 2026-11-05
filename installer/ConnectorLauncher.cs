// DramaForge 1.8.0 native protocol launcher — modeled on NodeCanvas 1.13.0.
// This is compiled as a WinForms executable on a Windows build runner.
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Web;
using System.Text;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Windows.Forms;
using System.Drawing;
using System.Threading;
using System.Web.Script.Serialization;

[assembly:System.Reflection.AssemblyTitle("DramaForge Native Connector")]
[assembly:System.Reflection.AssemblyVersion("1.8.0.0")]
internal static class NativeLauncher {
  internal const string Version="1.8.0";
  internal static readonly string Root=Path.GetDirectoryName(typeof(NativeLauncher).Assembly.Location);
  internal static readonly string Data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"DramaForgeConnector");
  internal static string ValidOrigin(string value) {
    Uri u;
    if(string.IsNullOrWhiteSpace(value)||!Uri.TryCreate(value,UriKind.Absolute,out u)||
       u.GetLeftPart(UriPartial.Authority)!=value||u.UserInfo!=""||u.Query!=""||u.Fragment!=""||u.AbsolutePath!="/")
      throw new ArgumentException("잘못된 웹주소입니다.");
    bool official=value=="https://dramaforge-lemon-ten.vercel.app";
    bool dev=u.Scheme=="http"&&(u.Host=="127.0.0.1"||u.Host=="localhost")&&u.Port==4173;
    if(!official&&!dev)throw new ArgumentException("승인되지 않은 DramaForge 웹주소입니다.");
    return value;
  }
  internal static string[] ParseActivation(string text) {
    Uri u;
    if(!Uri.TryCreate(text,UriKind.Absolute,out u)||u.Scheme!="dramaforge"||u.Host!="connect"||
      (u.AbsolutePath!=""&&u.AbsolutePath!="/")||u.Fragment!=""||u.UserInfo!=""||!u.IsDefaultPort)
       throw new ArgumentException("올바른 DramaForge 연결 요청이 아닙니다.");
    var query=HttpUtility.ParseQueryString(u.Query);
    if(query.Count!=2||query.GetValues("origin")==null||query.GetValues("origin").Length!=1||
      query.GetValues("challenge")==null||query.GetValues("challenge").Length!=1)
      throw new ArgumentException("연결 요청 항목이 올바르지 않습니다.");
    string origin=ValidOrigin(query["origin"]),challenge=query["challenge"];
    if(challenge==null||challenge.Length!=64||challenge.Any(c=>!((c>='a'&&c<='f')||(c>='0'&&c<='9'))))
      throw new ArgumentException("연결 확인값이 올바르지 않습니다.");
    return new[]{origin,challenge};
  }
  internal static void SaveActivation(string[] activation) {
    Directory.CreateDirectory(Data);
    string trust=Path.Combine(Data,"trusted-origins.txt");
    bool known=File.Exists(trust)&&File.ReadAllLines(trust).Contains(activation[0]);
    if(!known){
      var yes=MessageBox.Show("이 웹사이트를 ChatGPT Codex 연결 앱에 허용하시겠습니까?\n\n"+activation[0]+
       "\n\n주소를 확인한 뒤 허용하세요. 허용 이력은 사용자 PC에만 저장됩니다.",
       "DramaForge · 웹사이트 연결 승인",MessageBoxButtons.YesNo,MessageBoxIcon.Question);
      if(yes!=DialogResult.Yes)throw new OperationCanceledException("웹사이트 연결이 허용되지 않았습니다.");
      File.AppendAllText(trust,activation[0]+Environment.NewLine,Encoding.UTF8);
    }
    string dir=Path.Combine(Data,"activations");Directory.CreateDirectory(dir);
    var record=new {origin=activation[0],challenge=activation[1],createdAt=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()};
    File.WriteAllText(Path.Combine(dir,Guid.NewGuid().ToString("N")+".json"),
       new JavaScriptSerializer().Serialize(record),new UTF8Encoding(false));
  }
  internal static bool Healthy() {
    try{
      var req=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:7331/health");
      req.Timeout=1200;req.ReadWriteTimeout=1200;req.Proxy=null;
      using(var response=(HttpWebResponse)req.GetResponse())
      using(var reader=new StreamReader(response.GetResponseStream())){
        var data=reader.ReadToEnd();
        return response.StatusCode==HttpStatusCode.OK && data.Contains("\"dramaforge-bridge\"") && data.Contains("\"1.8.0\"");
      }
    }catch{return false;}
  }
  [STAThread]
  internal static int Main(string[] args){
    if(args.Length>0&&args[0]=="--self-test"){
      try{
        ParseActivation("dramaforge://connect?origin=https%3A%2F%2Fdramaforge-lemon-ten.vercel.app&challenge="+new string('a',64));
        try{ParseActivation("dramaforge://connect?origin=https%3A%2F%2Fevil.example&challenge="+new string('a',64));return 2;}catch(ArgumentException){}
        return 0;
      }catch{return 1;}
    }
    Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
    try{
      if(args.Length>0)SaveActivation(ParseActivation(args[0]));
      bool created;
      string identity=WindowsIdentity.GetCurrent().User.Value.Replace('-','_');
      using(var mutex=new Mutex(true,"Local\\DramaForgeConnector-"+identity,out created)){
        if(!created)return 0; // The already-running instance will read the pending activation file.
        if(Healthy())return 0; // A healthy same-version bridge may be running from a legacy launcher.
        Application.Run(new ConnectorContext());
      }
      return 0;
    }catch(OperationCanceledException){return 0;}
    catch(Exception e){MessageBox.Show(e.Message,"DramaForge 연결 앱",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
  }
}
internal sealed class ConnectorContext:ApplicationContext {
  NotifyIcon icon;Process child;bool stopping;System.Windows.Forms.Timer monitor;
  public ConnectorContext(){
    var runtime=Path.Combine(NativeLauncher.Root,"runtime");
    string node=Path.Combine(runtime,"node.exe"),codex=Path.Combine(runtime,"codex.exe");
    string server=Path.Combine(NativeLauncher.Root,"bridge","server.mjs");
    if(!File.Exists(node)||!File.Exists(codex)||!File.Exists(server))throw new Exception("연결 앱 설치 파일이 누락되었습니다. 설치 도우미에서 복구하세요.");
    Directory.CreateDirectory(NativeLauncher.Data);
    string logs=Path.Combine(NativeLauncher.Data,"logs");Directory.CreateDirectory(logs);
    var menu=new ContextMenuStrip();menu.Items.Add("DramaForge 연결 앱 종료",null,(s,e)=>ExitThread());
    icon=new NotifyIcon{Icon=SystemIcons.Application,Text="DramaForge AI 연결 앱",Visible=true,ContextMenuStrip=menu};
    var info=new ProcessStartInfo(node,"\""+server+"\""){
      UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=NativeLauncher.Root,
      RedirectStandardInput=true,RedirectStandardOutput=true,RedirectStandardError=true
    };
    info.EnvironmentVariables["DRAMAFORGE_CODEX"]=codex;
    info.EnvironmentVariables["DRAMAFORGE_ACTIVATION_DIR"]=Path.Combine(NativeLauncher.Data,"activations");
    info.EnvironmentVariables["PATH"]=runtime+";"+Environment.GetEnvironmentVariable("PATH");
    child=new Process{StartInfo=info,EnableRaisingEvents=true};
    child.OutputDataReceived+=(s,e)=>{if(e.Data!=null)Log(logs,"stdout.log",e.Data);};
    child.ErrorDataReceived+=(s,e)=>{if(e.Data!=null)Log(logs,"stderr.log",e.Data);};
    if(!child.Start())throw new Exception("로컬 연결 프로그램을 시작하지 못했습니다.");
    child.BeginOutputReadLine();child.BeginErrorReadLine();
    monitor=new System.Windows.Forms.Timer{Interval=1500};
    monitor.Tick+=(s,e)=>{if(child.HasExited){monitor.Stop();if(!stopping)MessageBox.Show("AI 연결 앱이 종료되었습니다. "+logs+" 의 오류 로그를 확인하세요.","DramaForge 연결 앱");ExitThread();}};
    monitor.Start();
  }
  static void Log(string directory,string name,string line){try{File.AppendAllText(Path.Combine(directory,name),line+Environment.NewLine);}catch{}}
  protected override void ExitThreadCore(){
    if(stopping)return;stopping=true;if(monitor!=null)monitor.Stop();
    if(child!=null&&!child.HasExited){
      try{child.StandardInput.WriteLine("shutdown");child.StandardInput.Flush();if(!child.WaitForExit(4000))child.Kill();}catch{}
    }
    icon.Visible=false;icon.Dispose();base.ExitThreadCore();
  }
}
