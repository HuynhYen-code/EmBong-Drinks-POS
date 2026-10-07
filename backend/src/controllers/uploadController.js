const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cấu hình Cloudinary
// (Sẽ dùng biến môi trường khi deploy lên Render)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'embong-pos', // Tên thư mục trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage: storage });

exports.uploadMiddleware = upload.single('image');

exports.uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy file ảnh' });
  }
  // req.file.path chứa URL ảnh trả về từ Cloudinary
  res.json({ image_url: req.file.path });
};
