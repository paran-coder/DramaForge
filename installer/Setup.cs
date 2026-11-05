// DramaForge native Windows setup (unsigned until signed on release).
// Embeds the launcher and bridge scripts; downloads only pinned, hashed runtimes.
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;
using System.IO.Compression;

[assembly:System.Reflection.AssemblyTitle("DramaForge Connector Setup")]
[assembly:System.Reflection.AssemblyVersion("1.8.0.0")]
internal static class SetupMain {
 [STAThread]
 internal static int Main(string[] args){
  if(args.Length>0&&args[0]=="--self-test"){
   var asm=System.Reflection.Assembly.GetExecutingAssembly();
   foreach(string key in new[]{"setup-script","launcher-bin","payload.zip"}){
    using(var res=asm.GetManifestResourceStream(key)){if(res==null||res.Length<100)return 1;}
   }
   return 0;
  }
  Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
  Application.Run(new SetupForm());return 0;
 }
}
internal sealed class SetupForm:Form {
 readonly Button install;readonly TextBox log;bool busy;
 public SetupForm(){
  Text="DramaForge AI 연결 앱 설치 · v1.8.0";ClientSize=new Size(610,360);
  FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;
  Font=new Font("Segoe UI",10);
  Controls.Add(new Label{Text="ChatGPT Codex 연결 앱 설치",Font=new Font(Font.FontFamily,17,FontStyle.Bold),Location=new Point(22,16),Size=new Size(570,40)});
  Controls.Add(new Label{Text="한 번 설치하면 DramaForge의 AI 연결 버튼으로 앱이 자동 실행됩니다.\n기존 설치는 확인 후 같은 사용자 폴더에 업데이트합니다.",Location=new Point(24,62),Size=new Size(555,54)});
  log=new TextBox{Location=new Point(24,125),Size=new Size(560,157),Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical};Controls.Add(log);
  install=new Button{Text="설치 / 업데이트",Location=new Point(421,298),Size=new Size(162,43)};install.Click+=async(s,e)=>await Run();Controls.Add(install);
  Controls.Add(new Label{Text="공식 Node.js·Codex 파일 SHA-256 검증 · 관리자 권한 없이 설치",Location=new Point(24,304),Size=new Size(382,40)});
  FormClosing+=(s,e)=>{if(busy){e.Cancel=true;MessageBox.Show("설치가 진행 중입니다. 완료 후 닫으세요.");}};
 }
 void Append(string line){try{if(IsHandleCreated&&!IsDisposed)BeginInvoke(new Action(()=>{log.AppendText(line+Environment.NewLine);log.SelectionStart=log.TextLength;log.ScrollToCaret();}));}catch{}}
 static void ExtractSafe(ZipArchive zip,string dest){
  string root=Path.GetFullPath(dest)+Path.DirectorySeparatorChar;
  Directory.CreateDirectory(root);
  foreach(var e in zip.Entries){
   string file=Path.GetFullPath(Path.Combine(root,e.FullName.Replace('/',Path.DirectorySeparatorChar)));
   if(!file.StartsWith(root,StringComparison.OrdinalIgnoreCase))throw new Exception("설치 리소스 경로가 올바르지 않습니다.");
   if(e.FullName.EndsWith("/"))continue;
   Directory.CreateDirectory(Path.GetDirectoryName(file));
   using(var input=e.Open())using(var output=new FileStream(file,FileMode.CreateNew,FileAccess.Write)){input.CopyTo(output);}
  }
 }
 async Task Run(){
  if(busy)return;busy=true;install.Enabled=false;
  string stage=Path.Combine(Path.GetTempPath(),"DramaForgeNative-"+Guid.NewGuid().ToString("N"));
  try{
   Directory.CreateDirectory(stage);Append("연결 앱과 구성 요소를 확인합니다.");
   var asm=System.Reflection.Assembly.GetExecutingAssembly();
   string script;
   using(var res=asm.GetManifestResourceStream("setup-script"))using(var reader=new StreamReader(res,Encoding.UTF8))script=reader.ReadToEnd();
   string payload=Path.Combine(stage,"payload");
   using(var res=asm.GetManifestResourceStream("payload.zip"))using(var zip=new ZipArchive(res,ZipArchiveMode.Read))ExtractSafe(zip,payload);
   using(var res=asm.GetManifestResourceStream("launcher-bin"))
   using(var output=new FileStream(Path.Combine(payload,"DramaForge-Connect.exe"),FileMode.CreateNew))res.CopyTo(output);
   string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
   await Task.Run(()=>{
    var info=new ProcessStartInfo("powershell.exe","-NoProfile -EncodedCommand "+encoded){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true};
    info.EnvironmentVariables["DRAMAFORGE_PAYLOAD_STAGE"]=payload;
    using(var proc=Process.Start(info)){
     if(proc==null)throw new Exception("PowerShell을 실행하지 못했습니다.");
     proc.OutputDataReceived+=(s,e)=>{if(e.Data!=null)Append(e.Data);};
     proc.ErrorDataReceived+=(s,e)=>{if(e.Data!=null)Append(e.Data);};
     proc.BeginOutputReadLine();proc.BeginErrorReadLine();proc.WaitForExit();
     if(proc.ExitCode!=0)throw new Exception("설치 프로그램 종료 코드: "+proc.ExitCode);
    }
   });
   Append("설치가 완료되었습니다. 웹브라우저에서 AI 연결을 누르세요.");install.Text="완료";
  }catch(Exception e){Append("설치 실패: "+e.Message);MessageBox.Show(e.Message,"DramaForge 설치",MessageBoxButtons.OK,MessageBoxIcon.Error);install.Text="다시 시도";}
  finally{try{Directory.Delete(stage,true);}catch{}busy=false;install.Enabled=true;}
 }
}
