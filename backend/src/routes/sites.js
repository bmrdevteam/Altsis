import express from "express";
const router = express.Router();
import { isOwAdmin } from "../middleware/auth.js";
import * as sites from "../controllers/sites.js";

router.get("/:academyId/meta", isOwAdmin, sites.getMeta);
router.put("/:academyId/published", isOwAdmin, sites.updatePublished);
router.get("/:academyId/files", isOwAdmin, sites.listFiles);
router.post("/:academyId/mkdir", isOwAdmin, sites.mkdir);
router.post("/:academyId/upload", isOwAdmin, sites.uploadFile);
router.get("/:academyId/content", isOwAdmin, sites.getContent);
router.put("/:academyId/content", isOwAdmin, sites.putContent);
router.put("/:academyId/move", isOwAdmin, sites.moveFile);
router.delete("/:academyId/files", isOwAdmin, sites.removeFiles);
router.post("/:academyId/import-zip", isOwAdmin, sites.importZip);

// Preview (auth) — remaining path after /preview
router.use("/:academyId/preview", isOwAdmin, (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const rel = decodeURIComponent((req.path || "/").replace(/^\/+/, ""));
  req.params[0] = rel;
  return sites.servePreview(req, res);
});

export { router };
