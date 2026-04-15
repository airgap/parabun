#!/usr/bin/env bash
#
# Parabun installer. Downloads the latest release binary from
# github.com/airgap/parabun into ~/.parabun/bin and wires up PATH.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install.sh | bash -s parabun-abc1234
#
# The optional argument pins a specific release tag; default is the
# current "Latest release" on GitHub.

set -euo pipefail

platform=$(uname -ms)

Color_Off=''; Red=''; Green=''; Dim=''; Bold_White=''; Bold_Green=''
if [[ -t 1 ]]; then
    Color_Off='\033[0m'
    Red='\033[0;31m'
    Green='\033[0;32m'
    Dim='\033[0;2m'
    Bold_Green='\033[1;32m'
    Bold_White='\033[1m'
fi

error() { echo -e "${Red}error${Color_Off}:" "$@" >&2; exit 1; }
info()      { echo -e "${Dim}$@ ${Color_Off}"; }
info_bold() { echo -e "${Bold_White}$@ ${Color_Off}"; }
success()   { echo -e "${Green}$@ ${Color_Off}"; }

if [[ $# -gt 1 ]]; then
    error 'too many arguments; pass at most one release tag (e.g. "parabun-abc1234")'
fi

case $platform in
'Darwin arm64')
    target=macos-arm64
    exe_ext=''
    ;;
'Linux x86_64')
    target=linux-x64
    exe_ext=''
    ;;
'MINGW64'*)
    target=windows-x64
    exe_ext='.exe'
    ;;
*)
    error "unsupported platform: $platform (parabun ships linux-x64, macos-arm64, windows-x64)"
    ;;
esac

if [[ $target = macos-arm64 && $(sysctl -n sysctl.proc_translated 2>/dev/null) = 1 ]]; then
    info "Running under Rosetta 2; installing the native arm64 build anyway."
fi

GITHUB=${GITHUB-"https://github.com"}
github_repo="$GITHUB/airgap/parabun"
asset="parabun-${target}${exe_ext}"

if [[ $# = 0 ]]; then
    parabun_uri="$github_repo/releases/latest/download/$asset"
else
    parabun_uri="$github_repo/releases/download/$1/$asset"
fi

install_env=PARABUN_INSTALL
bin_env=\$$install_env/bin
install_dir=${PARABUN_INSTALL:-$HOME/.parabun}
bin_dir=$install_dir/bin
exe=$bin_dir/parabun$exe_ext

mkdir -p "$bin_dir" || error "failed to create install directory \"$bin_dir\""

curl --fail --location --progress-bar --output "$exe" "$parabun_uri" \
    || error "failed to download parabun from \"$parabun_uri\""

chmod +x "$exe" || error 'failed to set permissions on parabun executable'

tildify() {
    if [[ $1 = $HOME/* ]]; then
        echo "${1/$HOME\//\~/}"
    else
        echo "$1"
    fi
}

success "parabun was installed successfully to $Bold_Green$(tildify "$exe")"

if command -v parabun >/dev/null; then
    echo "Run 'parabun --help' to get started"
    exit
fi

tilde_bin_dir=$(tildify "$bin_dir")
quoted_install_dir=\"${install_dir//\"/\\\"}\"
if [[ $quoted_install_dir = \"$HOME/* ]]; then
    quoted_install_dir=${quoted_install_dir/$HOME\//\$HOME/}
fi

echo
refresh_command=''

append_to() {
    local cfg=$1
    if [[ -w $cfg ]]; then
        {
            echo -e "\n# parabun"
            for c in "${commands[@]}"; do echo "$c"; done
        } >>"$cfg"
        info "Added \"$tilde_bin_dir\" to \$PATH in \"$(tildify "$cfg")\""
        return 0
    fi
    return 1
}

case $(basename "$SHELL") in
fish)
    commands=(
        "set --export $install_env $quoted_install_dir"
        "set --export PATH $bin_env \$PATH"
    )
    fish_config=$HOME/.config/fish/config.fish
    if append_to "$fish_config"; then
        refresh_command="source $(tildify "$fish_config")"
    else
        echo "Manually add the directory to $(tildify "$fish_config") (or similar):"
        for c in "${commands[@]}"; do info_bold "  $c"; done
    fi
    ;;
zsh)
    commands=(
        "export $install_env=$quoted_install_dir"
        "export PATH=\"$bin_env:\$PATH\""
    )
    zsh_config=$HOME/.zshrc
    if append_to "$zsh_config"; then
        refresh_command="exec $SHELL"
    else
        echo "Manually add the directory to $(tildify "$zsh_config") (or similar):"
        for c in "${commands[@]}"; do info_bold "  $c"; done
    fi
    ;;
bash)
    commands=(
        "export $install_env=$quoted_install_dir"
        "export PATH=\"$bin_env:\$PATH\""
    )
    bash_configs=("$HOME/.bash_profile" "$HOME/.bashrc")
    if [[ ${XDG_CONFIG_HOME:-} ]]; then
        bash_configs+=(
            "$XDG_CONFIG_HOME/.bash_profile"
            "$XDG_CONFIG_HOME/.bashrc"
            "$XDG_CONFIG_HOME/bash_profile"
            "$XDG_CONFIG_HOME/bashrc"
        )
    fi
    set_manually=true
    for cfg in "${bash_configs[@]}"; do
        if append_to "$cfg"; then
            refresh_command="source $cfg"
            set_manually=false
            break
        fi
    done
    if [[ $set_manually = true ]]; then
        echo "Manually add the directory to ~/.bashrc (or similar):"
        for c in "${commands[@]}"; do info_bold "  $c"; done
    fi
    ;;
*)
    echo 'Manually add the directory to ~/.bashrc (or similar):'
    info_bold "  export $install_env=$quoted_install_dir"
    info_bold "  export PATH=\"$bin_env:\$PATH\""
    ;;
esac

echo
info "To get started, run:"
echo
if [[ $refresh_command ]]; then
    info_bold "  $refresh_command"
fi
info_bold "  parabun --help"
