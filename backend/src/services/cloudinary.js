const cloudinary = require('cloudinary').v2;

function configure() {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } else {
    console.warn('[cloudinary] Credentials not set — uploads will fail gracefully');
  }
}
configure();

async function uploadImage(buffer, publicId) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('[cloudinary:DEV] uploadImage skipped — no credentials');
    return `https://placehold.co/800x450?text=${encodeURIComponent(publicId)}`;
  }
  return new Promise((resolve, reject) => {
    const fs = require("fs");

cloudinary.uploader.upload_large(
    filePath,
    {
        resource_type: "video",
        chunk_size: 6000000
    }
);

    stream.end(buffer);
  });
}

async function uploadVideo(buffer, publicId) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('[cloudinary:DEV] uploadVideo skipped — no credentials');
    return null;
  }
  return new Promise((resolve, reject) => {
  const fs = require("fs");

cloudinary.uploader.upload_large(
    filePath,
    {
        resource_type: "video",
        chunk_size: 6000000
    }
);

    stream.end(buffer);
  });
}



async function uploadBuffer(buffer, publicId, resourceType = 'raw') {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('[cloudinary:DEV] uploadBuffer skipped — no credentials');
    return null;
  }
  return new Promise((resolve, reject) => {
  const fs = require("fs");

cloudinary.uploader.upload_large(
    filePath,
    {
        resource_type: "video",
        chunk_size: 6000000
    }
);

    stream.end(buffer);
  });
}

async function deleteAsset(publicId, resourceType = 'image') {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadImage, uploadVideo, uploadBuffer, deleteAsset };
