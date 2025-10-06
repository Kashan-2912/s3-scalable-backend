import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { generateS3Key, sanitizeFileName } from "../utils/helpers.js";
import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3.config.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = new Hono();

app.post("/create-multipart", zValidator("json", z.object({
    fileName: z.string().min(1),
    fileType: z.string(),
    fileSize: z.number().min(1),
    customKey: z.string().optional(),
})), async (c) => {
    try {
        const { fileName, fileType, fileSize, customKey } = c.req.valid("json");

    const sanitizedFileName = sanitizeFileName(fileName)
    const s3Key = generateS3Key(sanitizedFileName, customKey);

    const command = new CreateMultipartUploadCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        ContentType: fileType,
        Metadata: {
            "uploaded-at": new Date().toISOString(),
            "file-size": fileSize.toString(),
            "upload-type": "multipart",
        },
    })

    const res = await s3Client.send(command);

    if(!res.UploadId){
        return c.json({ error: "Failed to create multipart upload" }, 500);
    }

    return c.json({
        uploadId: res.UploadId,
        key: s3Key,
        bucket: process.env.AWS_S3_BUCKET_NAME!,
    });
    } catch (error) {
        console.error("Error creating multipart upload:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

app.post("/create-presigned-urls", 
    zValidator("json", z.object({
        uploadId: z.string(),
        key: z.string(),
        parts: z.number().min(1).max(1000),
    })),
    async (c) => {
        const { uploadId, key, parts } = c.req.valid("json");

        try {
            const presignedUrls = await Promise.all(
                Array.from({ length: parts }, (_, i) => i + 1).map(async (partNumber) => {
                    const command = new UploadPartCommand(({
                        Bucket: process.env.AWS_S3_BUCKET_NAME!,
                        Key: key,
                        UploadId: uploadId,
                        PartNumber: partNumber,
                    }));

                    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                    return {partNumber, url};
                })
            );

            return c.json({ presignedUrls });
        } catch (error) {
            console.error("Error creating presigned URLs:", error);
            return c.json({ error: "Internal server error" }, 500);
        }
    }
);

app.post("/complete-multipart", 
    zValidator("json", z.object({
        uploadId: z.string(),
        key: z.string(),
        parts: z.array(z.object({
            ETag: z.string(),
            PartNumber: z.number().min(1),
        })),
    })),
    async (c) => {
        const { uploadId, key, parts } = c.req.valid("json");

        try {
            const command = new CompleteMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME!,
                Key: key,
                MultipartUpload: {
                    Parts: parts,
                },
                UploadId: uploadId,
            });

            const res = await s3Client.send(command);
            return c.json({ message: "Upload completed successfully", location: res.Location });
        } catch (error) {
            console.error("Error completing multipart upload:", error);
            return c.json({ error: "Internal server error" }, 500);
        }
    }
);

export default app;