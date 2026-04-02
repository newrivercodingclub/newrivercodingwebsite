{
  description = "Static site compiler for GitHub Pages";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          python = pkgs.python313;
          pythonEnv = python.withPackages (ps: [
            ps.watchdog
          ]);
        in {
          default = pkgs.mkShell {
            name = "site-compiler";
            packages = [ pythonEnv ];
            shellHook = ''
              echo "site compiler ready — python $(python --version)"
              echo "  python compile.py          # compile once"
              echo "  python compile.py --watch  # compile + watch"
            '';
          };
        });

      apps = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          python = pkgs.python313;
          pythonEnv = python.withPackages (ps: [ ps.watchdog ]);
        in {
          default = {
            type    = "app";
            program = toString (pkgs.writeShellScript "compile" ''
              exec ${pythonEnv}/bin/python ${self}/compile.py "$@"
            '');
          };
        });
    };
}
