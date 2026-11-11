{
  description = "Node.js and Prisma development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      utils,
    }:
    utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            nodejs_26
            pnpm
            openssl
            pkg-config
            git
            cacert
          ];

          buildInputs = with pkgs; [
            prisma-engines
          ];

          shellHook = ''
            # Prisma environment variables
            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
            export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
            export PRISMA_INTROSPECTION_ENGINE_BINARY="${pkgs.prisma-engines}/bin/introspection-engine"
            export PRISMA_FMT_ENGINE_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"

            # OpenSSL / Library path setup
            export LD_LIBRARY_PATH="${pkgs.openssl.out}/lib:$LD_LIBRARY_PATH"

            echo "❄️ NixOS Prisma environment loaded"
          '';
        };
      }
    );
}
