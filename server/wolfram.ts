import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

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

export default router;