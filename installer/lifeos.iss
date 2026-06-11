; ============================================================================
; Life OS - instalador Windows (Inno Setup 6) - DISTRIBUICAO Fase 1
; ============================================================================
; Pre-requisito: rodar `npm run dist` antes (monta dist/app).
; Compilar: abrir este arquivo no Inno Setup Compiler e apertar Run (F9),
; ou via CLI:  ISCC.exe installer\lifeos.iss
; Saida: release\LifeOS-Setup.exe
;
; Decisoes (ver md/DISTRIBUICAO.md):
; - Instala POR USUARIO em {localappdata}\LifeOS\app (sem admin, menos SmartScreen)
; - Dados do amigo ficam em {localappdata}\LifeOS\data (update NUNCA toca)
; - Firewall: nao mexe aqui (precisa de admin); o painel Acesso Remoto do app
;   tem o botao "Liberar" que pede UAC na hora certa.

#define AppName "Life OS"
; Manter alinhado com a "version" do package.json (aparece no card Sobre do app)
#define AppVersion "0.1.0"
#define AppPublisher "Life OS"
#define AppDir "{localappdata}\LifeOS\app"

[Setup]
AppId={{B7E4C6D1-5A92-4F3B-9C1E-0A1B2C3D4E5F}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={#AppDir}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=LifeOS-Setup
SetupIconFile=..\public\launcher\open.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
UninstallDisplayIcon={#AppDir}\server\public\launcher\open.ico

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Atalhos:"
Name: "startupicon"; Description: "Iniciar o Life OS junto com o Windows (servidor em segundo plano)"; GroupDescription: "Inicialização:"; Flags: unchecked

[Files]
Source: "..\dist\app\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
; Abrir: node portátil roda o launcher (sobe servidor em background e abre o app)
Name: "{userprograms}\Life OS"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launcher.mjs"""; WorkingDir: "{app}"; IconFilename: "{app}\server\public\launcher\open.ico"; Comment: "Abrir o Life OS"
Name: "{userprograms}\Fechar Life OS"; Filename: "{app}\node\node.exe"; Parameters: """{app}\stop.mjs"""; WorkingDir: "{app}"; IconFilename: "{app}\server\public\launcher\close.ico"; Comment: "Encerrar o servidor do Life OS"
Name: "{userdesktop}\Life OS"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launcher.mjs"""; WorkingDir: "{app}"; IconFilename: "{app}\server\public\launcher\open.ico"; Tasks: desktopicon
; Iniciar com o Windows: sobe o servidor SEM abrir o navegador
Name: "{userstartup}\Life OS"; Filename: "{app}\node\node.exe"; Parameters: """{app}\launcher.mjs"" --no-open"; WorkingDir: "{app}"; IconFilename: "{app}\server\public\launcher\open.ico"; Tasks: startupicon

[Run]
Filename: "{app}\node\node.exe"; Parameters: """{app}\launcher.mjs"""; WorkingDir: "{app}"; Description: "Abrir o Life OS agora"; Flags: postinstall nowait skipifsilent

[UninstallRun]
; Garante que o servidor nao fica orfao ao desinstalar
Filename: "{app}\node\node.exe"; Parameters: """{app}\stop.mjs"""; WorkingDir: "{app}"; RunOnceId: "StopLifeOS"; Flags: skipifdoesntexist

; IMPORTANTE: a pasta {localappdata}\LifeOS\data (banco, config, backups do
; amigo) NAO esta em [Files] nem em [UninstallDelete] - sobrevive de proposito.

[Code]
// DISTRIBUICAO Fase 2: antes de instalar POR CIMA (update), o instalador
// (1) para o servidor que possa estar rodando e (2) faz um snapshot dos .db
// e do config em data\backups\pre-update\<versao-data>. Rede de seguranca:
// se o update der errado, o banco de ontem esta a uma copia de distancia.

procedure BackupFile(const Src, DestDir: string);
begin
  if FileExists(Src) then begin
    ForceDirectories(DestDir);
    // Inno 6.7+: CopyFile (ex-FileCopy)
    CopyFile(Src, AddBackslash(DestDir) + ExtractFileName(Src), False);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir, BackupDir: string;
  ResultCode: integer;
begin
  if CurStep = ssInstall then begin
    // 1. Para o servidor (instalacao anterior) para liberar arquivos em uso.
    if FileExists(ExpandConstant('{app}\stop.mjs')) then
      Exec(ExpandConstant('{app}\node\node.exe'),
           '"' + ExpandConstant('{app}\stop.mjs') + '"',
           ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // 2. Snapshot pre-update dos dados (so se ja existem = e um update).
    DataDir := ExpandConstant('{localappdata}\LifeOS\data');
    if DirExists(DataDir) then begin
      BackupDir := AddBackslash(DataDir) + 'backups\pre-update\v{#AppVersion}-' +
                   GetDateTimeString('yyyymmdd-hhnn', '-', '-');
      BackupFile(AddBackslash(DataDir) + 'life_os.db', BackupDir);
      BackupFile(AddBackslash(DataDir) + 'life_os.replica.db', BackupDir);
      BackupFile(AddBackslash(DataDir) + 'life-os-config.json', BackupDir);
    end;
  end;
end;
