// Optional native Windows bootstrapper for the same pinned installer script.
// Build on Windows using installer/build-windows.ps1; do not claim it is signed.
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;

[assembly: System.Reflection.AssemblyTitle("DramaForge Connector Setup")]
[assembly: System.Reflection.AssemblyVersion("1.7.1.0")]

internal static class Program {
 [STAThread]
 public static void Main(string[] args) {
  if(args.Length>0 && args[0]=="--self-test") {
   var s=System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream("setup-script");
   Environment.Exit(s!=null && s.Length>3000 ? 0 : 1);
  }
  Application.EnableVisualStyles();
  Application.SetCompatibleTextRenderingDefault(false);
  Application.Run(new Installer());
 }
}
internal sealed class Installer:Form {
 readonly Button install;
 readonly TextBox log;
 readonly Label summary;
 bool running;
 public Installer() {
  Text="DramaForge AI 연결 도우미 · 1.7.1";
  ClientSize=new Size(590,340);MinimumSize=Size;MaximumSize=Size;
  Font=new Font("Segoe UI",10);StartPosition=FormStartPosition.CenterScreen;
  Controls.Add(new Label{Text="DramaForge — ChatGPT Codex 연결",Font=new Font(Font.FontFamily,17,FontStyle.Bold),Location=new Point(22,18),Size=new Size(530,42)});
  summary=new Label{Text="이 PC의 사용자 폴더에 필요한 Node.js와 Codex를 자동 설치합니다.\n인터넷 연결이 필요하며 관리자 권한은 사용하지 않습니다.",Location=new Point(24,66),Size=new Size(540,55)};
  Controls.Add(summary);
  log=new TextBox{Location=new Point(24,132),Size=new Size(540,130),Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical};
  Controls.Add(log);
  install=new Button{Text="설치 시작",Location=new Point(420,276),Size=new Size(144,42)};
  install.Click+=async(sender,e)=>await Run();Controls.Add(install);
  Controls.Add(new Label{Text="공식 Node.js/Codex 다운로드 · SHA-256 무결성 확인 · 로컬 연결 자동 실행",Location=new Point(24,286),Size=new Size(390,38)});
  FormClosing+=(s,e)=>{if(running){e.Cancel=true;MessageBox.Show("설치가 진행 중입니다. 완료 후 창을 닫으세요.");}};
 }
 void Append(string line){if(!IsDisposed && IsHandleCreated)BeginInvoke(new Action(()=>{log.AppendText(line+Environment.NewLine);log.SelectionStart=log.TextLength;log.ScrollToCaret();}));}
 async Task Run(){
  if(running)return;
  running=true;install.Enabled=false;Append("설치를 시작합니다. 최초 사용자 승인 이후에는 웹사이트가 자동으로 연결합니다.");
  try{
   var assembly=System.Reflection.Assembly.GetExecutingAssembly();
   string script;
   using(var resource=assembly.GetManifestResourceStream("setup-script")){
    if(resource==null)throw new Exception("설치 코드가 누락되었습니다.");
    using(var reader=new StreamReader(resource,Encoding.UTF8))script=reader.ReadToEnd();
   }
   // -EncodedCommand passes a fixed, embedded script; does not download or execute scripts from the internet.
   string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
   await Task.Run(()=>{
    var info=new ProcessStartInfo("powershell.exe","-NoProfile -EncodedCommand "+encoded){UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,WorkingDirectory=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)};
    using(var process=Process.Start(info)){
     if(process==null)throw new Exception("PowerShell 실행을 시작하지 못했습니다.");
     process.OutputDataReceived+=(s,e)=>{if(e.Data!=null)Append(e.Data);};
     process.ErrorDataReceived+=(s,e)=>{if(e.Data!=null)Append(e.Data);};
     process.BeginOutputReadLine();process.BeginErrorReadLine();process.WaitForExit();
     if(process.ExitCode!=0)throw new Exception("설치 실패 (종료 코드 "+process.ExitCode+")");
    }
   });
   Append("설치되었습니다. 브라우저로 돌아가면 연결을 다시 확인합니다.");
   install.Text="완료";
  }catch(Exception e){Append("설치 실패: "+e.Message);MessageBox.Show(e.Message,"DramaForge Setup",MessageBoxButtons.OK,MessageBoxIcon.Error);install.Text="재시도";}
  finally{running=false;install.Enabled=true;}
 }
}
