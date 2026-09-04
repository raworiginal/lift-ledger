import { updateAdminUser } from "../../../admin/api";

export default defineEventHandler((event) => updateAdminUser(event));
