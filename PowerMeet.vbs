Dim fso, shell, dir
Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

' Instala dependencias na primeira vez
If Not fso.FolderExists(dir & "\node_modules") Then
    shell.Run "cmd /c cd /d """ & dir & """ && npm install", 1, True
End If

' Abre o PowerMeet sem nenhuma janela de console
Dim electronPath
electronPath = dir & "\node_modules\.bin\electron.cmd"
shell.Run """" & electronPath & """ """ & dir & """", 0, False
