import { resetAdminPassword } from "../../../../admin/api";

export default defineEventHandler((event) => resetAdminPassword(event));
