import { BigNumber } from "ethers";
import { arrayify, Interface } from "ethers/lib/utils";
import { TracerDependenciesExtended } from "../../types";
import { colorContract, colorFunction } from "../../colors";
import { formatParam } from "./param";
import { formatResult } from "./result";

export async function formatContract(
  code: string,
  value: BigNumber,
  salt: BigNumber | null,
  deployedAddress: string | null,
  dependencies: TracerDependenciesExtended
) {
  const names = await dependencies.artifacts.getAllFullyQualifiedNames();

  for (const name of names) {
    const artifact = await dependencies.artifacts.readArtifact(name);
    const iface = new Interface(artifact.abi);

    if (
      artifact.bytecode.length > 2 &&
      artifact.bytecode.length <= code.length &&
      code.slice(0, artifact.bytecode.length) === artifact.bytecode
    ) {
      // we found the artifact with matching bytecode
      try {
        const constructorParamsDecoded = iface._decodeParams(
          iface.deploy.inputs,
          "0x" + code.slice(artifact.bytecode.length)
        );
        const inputArgs = formatResult(
          constructorParamsDecoded,
          iface.deploy,
          { decimals: -1, isInput: true, shorten: false },
          dependencies
        );
        const extra = [];
        if (value.gt(0)) {
          extra.push(`value: ${formatParam(value, dependencies)}`);
        }
        if (salt !== null) {
          extra.push(
            `salt: ${formatParam(
              salt.gt(1 << 32) ? salt.toHexString() : salt,
              dependencies
            )}`
          );
        }
        return `${colorContract(artifact.contractName)}.${colorFunction(
          "constructor"
        )}${extra.length !== 0 ? `{${extra.join(",")}}` : ""}(${inputArgs})${
          deployedAddress
            ? ` => (${formatParam(deployedAddress, dependencies)})`
            : ""
        }`;
      } catch {}
    }
  }

  return `Contract not recognized (deployCodeSize=${arrayify(code).length})`;
}
