# Windows Jenkins Agent Setup (windows-strix)

One-time setup to make `jenkins/build-windows.ps1` succeed on the
windows-strix agent. The agent itself (JNLP connection to the controller)
is already provisioned — this file documents the Parabun-specific
build toolchain on top of that.

## Required tools

Run in PowerShell as Administrator:

```powershell
# Chocolatey — package manager (skip if already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Parabun build deps
choco install -y bun llvm cmake ninja python git
# CMake from choco is usually new enough (3.30+); verify after:
cmake --version

# Visual Studio 2022 Build Tools with the VCTools workload
choco install -y visualstudio2022buildtools
& "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe" modify `
    --installPath "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools" `
    --add Microsoft.VisualStudio.Workload.VCTools `
    --includeRecommended --quiet
```

## LLVM version pin

Parabun's build (`scripts/build/config.ts`) rejects any clang outside
`[21.1, 21.1.99)`. `choco install llvm` installs the latest, which is
usually fine, but if `clang --version` shows 22.x or older than 21.1,
downgrade explicitly:

```powershell
choco install -y --version 21.1.8 llvm
```

## Verify

```powershell
bun --version
cmake --version
ninja --version
clang --version
git --version
where msbuild  # should resolve inside the VS 2022 Build Tools install
```

`jenkins/build-windows.ps1` adds `%USERPROFILE%\.bun\bin` and
`C:\Program Files\LLVM\bin` to PATH before running, so those two don't
need to be on the machine-wide PATH — but everything else does.
