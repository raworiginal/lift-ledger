import { createAdminUser } from "../../../admin/api";

export default defineEventHandler((event) => createAdminUser(event));
