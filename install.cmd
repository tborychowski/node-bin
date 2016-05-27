set /p loc=Location (c:\bin)?
IF [%loc%]==[] set loc=c:\bin

IF NOT exist %loc% ( md %loc%)
echo f|xcopy /qy src\*.js %loc%
::copy /qz src\*.js %loc%
