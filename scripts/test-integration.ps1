param([string]$Server='localhost',[string]$Backup='C:\Backups\SP_II.bak')
$ErrorActionPreference='Stop'
$testDatabase='UMGPlan_Test_'+[guid]::NewGuid().ToString('N')
if($testDatabase -notmatch '^UMGPlan_Test_[a-f0-9]{32}$'){throw 'Nombre de base de pruebas inválido.'}
$previousConnection=$env:SQL_CONNECTION_STRING
$escapedBackup=$Backup.Replace("'","''")
$restore=@"
DECLARE @data nvarchar(4000)=CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultDataPath'));
DECLARE @log nvarchar(4000)=CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultLogPath'));
DECLARE @statement nvarchar(max)=N'RESTORE DATABASE [$testDatabase] FROM DISK=N''$escapedBackup'' WITH MOVE N''SP_II'' TO N'''+REPLACE(@data,'''','''''')+N'$testDatabase.mdf'',MOVE N''SP_II_log'' TO N'''+REPLACE(@log,'''','''''')+N'${testDatabase}_log.ldf'',RECOVERY';
EXEC(@statement);
"@
$created=$false
try{
 & sqlcmd -S $Server -E -C -b -Q $restore
 if($LASTEXITCODE -ne 0){throw 'No se pudo crear la copia para pruebas.'}
 $created=$true
 $env:SQL_CONNECTION_STRING="Driver={ODBC Driver 17 for SQL Server};Server=$Server;Database=$testDatabase;Trusted_Connection=Yes;TrustServerCertificate=Yes;"
 node tests/backend.integration.mjs
 if($LASTEXITCODE -ne 0){throw 'Fallaron las pruebas de integración.'}
}finally{
 $env:SQL_CONNECTION_STRING=$previousConnection
 if($created){ & sqlcmd -S $Server -E -C -b -Q "ALTER DATABASE [$testDatabase] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$testDatabase];" }
}
