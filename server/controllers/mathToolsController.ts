import { evaluate } from 'mathjs';
import fetch from 'node-fetch';

// Calculator function
const calculate = async (req: any, res: any) => {
  try {
    const { expression } = req.body;

    // Use mathjs for safe evaluation
    const result = evaluate(expression);

    res.json({ result: result.toString() });
  } catch (error) {
    console.error("Calculator error:", error);
    res.status(400).json({ error: "Invalid expression" });
  }
};

// Graph function
const graph = async (req: any, res: any) => {
  try {
    const { functions, xRange, yRange } = req.body;

    // Validate functions using mathjs
    const validatedFunctions = [];
    for (const func of functions) {
      try {
        // Test the function with a sample value
        const testExpr = func.replace(/x/g, "1");
        evaluate(testExpr);
        validatedFunctions.push(func);
      } catch (error) {
        console.warn(`Invalid function: ${func}`);
      }
    }

    if (validatedFunctions.length === 0) {
      return res.status(400).json({ error: "No valid functions provided" });
    }

    // Generate plot data points
    const plotData = validatedFunctions.map((func, index) => {
      const xMin = xRange?.min ?? -10;
      const xMax = xRange?.max ?? 10;
      const points = 200;
      const step = (xMax - xMin) / points;

      const xData = [];
      const yData = [];

      for (let i = 0; i <= points; i++) {
        const x = xMin + i * step;
        try {
          const expr = func.replace(/x/g, x.toString());
          const y = evaluate(expr);
          if (typeof y === "number" && isFinite(y)) {
            xData.push(x);
            yData.push(y);
          }
        } catch (error) {
          // Skip invalid points
        }
      }

      return {
        function: func,
        xData,
        yData,
        color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
      };
    });

    res.json({ plotData, xRange, yRange });
  } catch (error) {
    console.error("Graph error:", error);
    res.status(400).json({ error: "Invalid graph request" });
  }
};

// Wolfram Alpha query
const wolframQuery = async (req: any, res: any) => {
  try {
    const { query } = req.body;

    const wolframAppId = process.env.WOLFRAM_APP_ID;
    if (!wolframAppId) {
      return res.status(501).json({ error: "Wolfram not configured" });
    }

    // Call Wolfram Alpha API
    const url = `http://api.wolframalpha.com/v2/query?input=${encodeURIComponent(
      query
    )}&format=plaintext&output=JSON&appid=${wolframAppId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wolfram API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse results
    const results = [];
    if (data.queryresult?.pods) {
      for (const pod of data.queryresult.pods) {
        if (pod.subpods) {
          for (const subpod of pod.subpods) {
            if (subpod.plaintext) {
              results.push({
                title: pod.title,
                plaintext: subpod.plaintext,
                image: subpod.img?.src,
              });
            }
          }
        }
      }
    }

    res.json({ results, success: results.length > 0 });
  } catch (error) {
    console.error("Wolfram error:", error);
    res.status(500).json({ error: "Failed to query Wolfram Alpha" });
  }
};

export {
  calculate,
  graph,
  wolframQuery
};
