import { listAdminUsers } from "../../../admin/api";

export default defineEventHandler((event) => listAdminUsers(event));
