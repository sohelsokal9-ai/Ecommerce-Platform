import getSupabaseClient from "../config/supabase.config";

interface UploadImageResult {
  url: string;
  path: string;
}

const BUCKET_NAME = "images";

export const uploadImageToSupabase = async (
  file: Express.Multer.File,
  folder = "products"
): Promise<UploadImageResult> => {
  const supabase = getSupabaseClient();
  const ext = file.originalname.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    path: fileName,
  };
};

export const uploadMultipleImagesToSupabase = async (
  files: Express.Multer.File[],
  folder = "products"
): Promise<UploadImageResult[]> => {
  const uploadPromises = files.map((file) => uploadImageToSupabase(file, folder));
  return Promise.all(uploadPromises);
};

export const deleteImageFromSupabase = async (path: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    console.error("Failed to delete image:", error.message);
  }
};
