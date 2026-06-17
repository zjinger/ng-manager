const { parseSketchFile, parseSketchFileAllArtboards, unzipSketchFile } = require("../lib");

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
}

const hasFlag = (name) => process.argv.includes(name);

const sketchFile = readArg("--file") || process.argv[2];

if (!sketchFile) {
  console.error(
    [
      "Usage:",
      "npm run handoff:parse -w @yinuo-ngm/design-handoff -- --file <sketch-file>",
      "",
      "Optional:",
      "--list                          List all pages and artboards",
      "--all                           Parse all artboards in the specified page",
      "--out <output-dir>",
      "--artboard <artboard-name>",
      "--page <page-index>",
    ].join("\n")
  );
  process.exit(1);
}

async function listPagesAndArtboards(filePath) {
  const unzipped = await unzipSketchFile(filePath);

  console.log(
    JSON.stringify(
      {
        pages: Array.from(unzipped.pages.entries()).map(([id, page], index) => ({
          index,
          id,
          name: page.name,
          artboards: (page.layers || [])
            .filter((layer) => layer._class === "artboard")
            .map((layer) => ({
              name: layer.name,
              frame: layer.frame,
            })),
        })),
      },
      null,
      2
    )
  );
}

async function main() {
  try {
    if (hasFlag("--list")) {
      await listPagesAndArtboards(sketchFile);
      return;
    }

    if (hasFlag("--all")) {
      const page = readArg("--page") ? parseInt(readArg("--page"), 10) : 0;
      const out = readArg("--out");

      if (!out) {
        console.error("--out is required when using --all");
        process.exit(1);
      }

      const result = await parseSketchFileAllArtboards({
        sketchFilePath: sketchFile,
        outputRoot: out,
        pageIndex: page,
      });

      console.log(
        JSON.stringify(
          {
            outputRoot: result.outputRoot,
            pageName: result.pageName,
            totalArtboards: result.totalArtboards,
            parsedArtboards: result.results.length,
            warnings: result.warnings,
            artboards: result.results.map((r) => ({
              artboardName: r.handoff.meta.artboardName,
              outputDir: r.outputDir,
              textCount: r.handoff.texts.length,
              componentCount: r.handoff.components.length,
            })),
          },
          null,
          2
        )
      );
      return;
    }

    const result = await parseSketchFile({
      sketchFilePath: sketchFile,
      outputDir: readArg("--out") || undefined,
      artboardName: readArg("--artboard") || undefined,
      pageIndex: readArg("--page") ? parseInt(readArg("--page"), 10) : undefined,
    });

    console.log(
      JSON.stringify(
        {
          outputDir: result.outputDir,
          warnings: result.warnings,
          summary: {
            documentName: result.handoff.meta.documentName,
            pageName: result.handoff.meta.pageName,
            artboardName: result.handoff.meta.artboardName,
            textCount: result.handoff.texts.length,
            componentCount: result.handoff.components.length,
          },
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("Failed to parse .sketch file:", error.message);
    process.exit(1);
  }
}

main();
