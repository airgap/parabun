# Runs on the windows-strix agent. Produces build\debug\bun-debug.exe AND
# build\release\bun.exe — the release binary is what Jenkins publishes as
# a GitHub Release asset for Windows x64.
#
# Prereqs on the agent (install once — see jenkins\setup-windows-agent.md):
#   - Bun (from bun.sh installer or `choco install bun`)
#   - LLVM 21 (must match Parabun's pinned range; see scripts/build/config.ts)
#   - Visual Studio 2022 Build Tools with the VCTools workload
#   - CMake 3.30+ on PATH
#   - Ninja on PATH
#   - Python 3 on PATH
#   - Git on PATH
#
# Fails fast on any error so Jenkins catches it at the right step.

$ErrorActionPreference = 'Stop'

# Make sure bun and LLVM are on PATH for the Jenkins service account even
# if they were installed into the user profile. Chocolatey and the bun
# installer both add shims here.
$env:PATH = "$env:USERPROFILE\.bun\bin;C:\Program Files\LLVM\bin;$env:PATH"

Write-Host "=== Host ==="
[System.Environment]::OSVersion | Format-List
Write-Host "bun: $(bun --version)"
Write-Host "cmake: $((cmake --version | Select-Object -First 1))"
Write-Host "ninja: $(ninja --version)"
Write-Host "clang: $((clang --version | Select-Object -First 1))"

Write-Host "=== Refreshing node-fallbacks deps ==="
Push-Location src\node-fallbacks
try {
    bun install --ignore-scripts
} finally {
    Pop-Location
}

if (-not $env:GIT_SHA) {
    try {
        $env:GIT_SHA = (git rev-parse HEAD).Trim()
    } catch {
        $env:GIT_SHA = 'unknown'
    }
}
Write-Host "GIT_SHA=$env:GIT_SHA"

Write-Host "=== Building Parabun (debug, no asan) ==="
bun run build:debug:noasan
if ($LASTEXITCODE -ne 0) { throw "debug build failed" }

Write-Host "=== Smoke-test debug binary ==="
& .\build\debug\bun-debug.exe --version
& .\build\debug\bun-debug.exe -e "console.log('hello from ' + process.platform + '/' + process.arch)"

Write-Host "=== Building Parabun (release) ==="
bun run build:release
if ($LASTEXITCODE -ne 0) { throw "release build failed" }

Write-Host "=== Smoke-test release binary ==="
& .\build\release\bun.exe --revision
& .\build\release\bun.exe -e "console.log('hello from release/' + process.platform + '/' + process.arch)"

Write-Host "=== Build artifacts ==="
Get-ChildItem build\debug\bun-debug.exe, build\release\bun.exe
