/**
 * Built-in Templates — Registration
 */

import { registerTemplate } from "../templates.ts";
import { httpStatusTemplate } from "./http-status.ts";
import { fileWatchTemplate } from "./file-watch.ts";

export function registerBuiltinTemplates(): void {
  registerTemplate(httpStatusTemplate);
  registerTemplate(fileWatchTemplate);
}
