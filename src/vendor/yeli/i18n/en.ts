// Vendored minimal version of yeli's src/i18n/en.ts.
//
// The vendored pure-logic layer (editor/, document/) references this module
// ONLY as a type: `import type { Labels } from "../i18n/en.ts"`. The original
// file is a 25KB UI label catalog (application-level, not pure logic). Since
// the vendored code never reads label values, only the `Labels` type is needed
// here. See src/vendor/yeli/README.md for the diff reason.
//
// `Record<string, string>` keeps `keyof Labels` as `string` (a mapped type, so
// no `number` key leaks in). The two explicit keys are required by
// `table-commands.ts` (`Pick<Labels, "newTableCell" | "newTableColumn">`) which
// needs `Labels` assignable to its own Pick.
export type Labels = Record<string, string> & {
  newTableCell: string;
  newTableColumn: string;
};
