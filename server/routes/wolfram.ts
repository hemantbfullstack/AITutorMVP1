import { Router } from "express";
import fetch from "node-fetch";
import multer from "multer";

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/** GET /api/wolfram/selftest?query=...  -> returns { imageBase64: "data:image/png;base64,..." } */
router.get("/selftest", async (req, res) => {
  try {
    const APPID = process.env.WOLFRAM_APP_ID;
    if (!APPID) return res.status(500).json({ error: "WOLFRAM_APP_ID is missing" });

    const q = (req.query.query as string) || "plot y = sin(x) from -2pi to 2pi";
    const url =
      "https://api.wolframalpha.com/v1/simple" +
      `?appid=${encodeURIComponent(APPID)}` +
      `&i=${encodeURIComponent(q)}` +
      `&background=ffffff&foreground=000000&width=900`;

    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: `Wolfram error ${r.status}`, detail: txt });
    }
    const buf = await r.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    res.json({ imageBase64: `data:image/png;base64,${b64}` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

/** POST /api/wolfram/simple  {query} -> { imageBase64 } */
router.post("/simple", async (req, res) => {
  try {
    const APPID = process.env.WOLFRAM_APP_ID;
    if (!APPID) return res.status(500).json({ error: "WOLFRAM_APP_ID is missing" });

    const q = (req.body?.query as string) || "";
    if (!q.trim()) return res.status(400).json({ error: "Missing 'query' body" });

    const url =
      "https://api.wolframalpha.com/v1/simple" +
      `?appid=${encodeURIComponent(APPID)}` +
      `&i=${encodeURIComponent(q)}` +
      `&background=ffffff&foreground=000000&width=900`;

    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: `Wolfram error ${r.status}`, detail: txt });
    }
    const buf = await r.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    res.json({ imageBase64: `data:image/png;base64,${b64}` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

/** POST /api/wolfram/full  {query} -> { success, pods, query } */
router.post("/full", async (req, res) => {
  try {
    const APPID = process.env.WOLFRAM_APP_ID;
    if (!APPID) return res.status(500).json({ error: "WOLFRAM_APP_ID is missing" });

    const q = (req.body?.query as string) || "";
    if (!q.trim()) return res.status(400).json({ error: "Missing 'query' body" });

    const url =
      "https://api.wolframalpha.com/v2/query" +
      `?appid=${encodeURIComponent(APPID)}` +
      `&input=${encodeURIComponent(q)}` +
      `&output=json&podstate=Step-by-step+solution`;

    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: `Wolfram error ${r.status}`, detail: txt });
    }

    const data = await r.json() as any;
    
    // Parse pods and subpods from the response
    const pods = [];
    if (data.queryresult && data.queryresult.pods) {
      for (const pod of data.queryresult.pods) {
        const parsedPod = {
          title: pod.title,
          subpods: []
        };
        
        if (pod.subpods) {
          for (const subpod of pod.subpods) {
            parsedPod.subpods.push({
              title: subpod.title || "",
              plaintext: subpod.plaintext || "",
              mathml: subpod.mathml || "",
              img: subpod.img ? {
                src: subpod.img.src,
                alt: subpod.img.alt,
                title: subpod.img.title,
                width: subpod.img.width,
                height: subpod.img.height
              } : null
            });
          }
        }
        
        pods.push(parsedPod);
      }
    }

    res.json({ 
      success: data.queryresult?.success || false,
      pods,
      query: q
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

/** POST /api/wolfram/image - Process uploaded image with Wolfram */
router.post("/image", upload.single('image'), async (req, res) => {
  try {
    const APPID = process.env.WOLFRAM_APP_ID;
    if (!APPID) return res.status(500).json({ error: "WOLFRAM_APP_ID is missing" });

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // Use Wolfram's image recognition API
    const url = "https://api.wolframalpha.com/v2/query" +
      `?appid=${encodeURIComponent(APPID)}` +
      `&input=${encodeURIComponent(imageDataUrl)}` +
      `&output=json&podstate=Step-by-step+solution`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ 
        error: `Wolfram image processing error ${response.status}`, 
        detail: errorText 
      });
    }

    const data = await response.json() as any;
    
    // Extract interpretation and generate visualization
    let interpretation = "";
    let visualizationBase64 = "";

    if (data.queryresult && data.queryresult.pods) {
      // Find interpretation pod
      const interpretationPod = data.queryresult.pods.find((pod: any) => 
        pod.title?.toLowerCase().includes('interpretation') || 
        pod.title?.toLowerCase().includes('result')
      );
      
      if (interpretationPod && interpretationPod.subpods) {
        interpretation = interpretationPod.subpods
          .map((subpod: any) => subpod.plaintext || "")
          .join(" ");
      }

      // Find image pod for visualization
      const imagePod = data.queryresult.pods.find((pod: any) => 
        pod.subpods && pod.subpods.some((subpod: any) => subpod.img)
      );
      
      if (imagePod && imagePod.subpods) {
        const imageSubpod = imagePod.subpods.find((subpod: any) => subpod.img);
        if (imageSubpod && imageSubpod.img) {
          // Fetch the image from Wolfram
          const imgResponse = await fetch(imageSubpod.img.src);
          if (imgResponse.ok) {
            const imgBuffer = await imgResponse.arrayBuffer();
            visualizationBase64 = Buffer.from(imgBuffer).toString('base64');
          }
        }
      }
    }

    // If no visualization found, try to generate one based on interpretation
    if (!visualizationBase64 && interpretation) {
      try {
        const simpleUrl = "https://api.wolframalpha.com/v1/simple" +
          `?appid=${encodeURIComponent(APPID)}` +
          `&i=${encodeURIComponent(interpretation)}` +
          `&background=ffffff&foreground=000000&width=900`;
        
        const simpleResponse = await fetch(simpleUrl);
        if (simpleResponse.ok) {
          const imgBuffer = await simpleResponse.arrayBuffer();
          visualizationBase64 = Buffer.from(imgBuffer).toString('base64');
        }
      } catch (err) {
        console.log("Could not generate visualization from interpretation");
      }
    }

    res.json({
      success: true,
      imageBase64: visualizationBase64 ? `data:image/png;base64,${visualizationBase64}` : null,
      interpretation: interpretation || "Image processed successfully, but no specific interpretation available.",
    });

  } catch (err: any) {
    console.error("Wolfram image processing error:", err);
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

export default router;