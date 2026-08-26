const MOE_API =
  "https://moe-ai-production.up.railway.app";

module.exports =
async function handler(
  request,
  response
) {

  response.setHeader(
    "Cache-Control",
    "no-store, max-age=0"
  );

  try {

    const healthResponse =
      await fetch(
        MOE_API +
        "/health",
        {
          headers:{
            Accept:
              "application/json"
          }
        }
      );

    if (
      !healthResponse.ok
    ) {

      throw new Error(
        "Moe AI health check failed"
      );

    }

    let signals = [];

    try {

      const openResponse =
        await fetch(
          MOE_API +
          "/v1/signals/open",
          {
            headers:{
              Accept:
                "application/json"
            }
          }
        );

      if (
        openResponse.ok
      ) {

        const data =
          await openResponse.json();

        signals =
          extractSignals(
            data
          );

      }

    }

    catch(error) {

      console.log(
        error.message
      );

    }

    if (
      signals.length === 0
    ) {

      const allResponse =
        await fetch(
          MOE_API +
          "/signals",
          {
            headers:{
              Accept:
                "application/json"
            }
          }
        );

      if (
        allResponse.ok
      ) {

        const data =
          await allResponse.json();

        const all =
          extractSignals(
            data
          );

        signals =
          all.filter(
            signal => {

          const status =
            String(
              signal.status ||
              ""
            )
            .toUpperCase();

          return (
            status ===
            "OPEN"
            ||
            status ===
            "ACTIVE"
            ||
            status ===
            "ENTERED"
          );

        });

      }

    }

    return response
    .status(200)
    .json({

      ok:true,

      signals,

      updated_at:
        new Date()
        .toISOString()

    });

  }

  catch(error) {

    console.error(
      error
    );

    return response
    .status(503)
    .json({

      ok:false,

      error:
        error.message
        ||
        "Unable to contact Moe AI"

    });

  }

};

function extractSignals(
  data
) {

  if (
    Array.isArray(
      data
    )
  ) {

    return data;

  }

  if (
    data &&
    Array.isArray(
      data.signals
    )
  ) {

    return data.signals;

  }

  if (
    data &&
    Array.isArray(
      data.data
    )
  ) {

    return data.data;

  }

  if (
    data &&
    Array.isArray(
      data.results
    )
  ) {

    return data.results;

  }

  return [];

}
