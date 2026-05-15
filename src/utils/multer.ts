import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { memoryStorage } from 'multer';

// export const multerConfig = (folder: string) => ({
//   storage: diskStorage({
//     destination: (req, file, cb) => {
//       const uploadPath = `./uploads/${folder}`;

//       // ✅ create folder if not exists
//       if (!fs.existsSync(uploadPath)) {
//         fs.mkdirSync(uploadPath, { recursive: true });
//       }

//       cb(null, uploadPath);
//     },

//     filename: (req, file, cb) => {
//       const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

//       cb(null, uniqueName + extname(file.originalname));
//     },
//   }),
// });

export const multerConfig = (
  fileSizeMB: number = 2,
  fieldSizeMB: number = 10,
) => ({
  storage: memoryStorage(),
  limits: {
    fileSize: fileSizeMB * 1024 * 1024,
    fieldSize: fieldSizeMB * 1024 * 1024,
  },
});
