#!/usr/bin/env npx tsx
import { Command } from "commander";
import { validateCommand } from "./commands/validate";
import { generateCommand } from "./commands/generate";
import { updateCommand } from "./commands/update";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { removeCommand } from "./commands/remove";
import { listCommand } from "./commands/list";
import { importCommand } from "./commands/import";

const program = new Command();

program
  .name("feather")
  .description(
    "Feather framework CLI — generate features, validate YAML, update generated code",
  )
  .version("0.1.0");

program.addCommand(validateCommand);
program.addCommand(generateCommand);
program.addCommand(updateCommand);
program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(removeCommand);
program.addCommand(listCommand);
program.addCommand(importCommand);

program.parse();
