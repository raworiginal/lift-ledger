import { deleteAdminUser } from "../../../admin/api";

export default defineEventHandler((event) => deleteAdminUser(event));
