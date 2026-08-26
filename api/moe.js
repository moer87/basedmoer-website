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

    /*
      First make sure the Railway
      Moe AI service is reachable.
    */

    const healthResponse =
      await fetch(
        MOE_API + "/health",
        {
          headers:{
            "Accept":"application/json"
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

    /*
      Try the agent-ready
      open-signals endpoint first.
    */

    let signals =
      [];

    let signalSource =
      null;

    try {

      const openResponse =
        await fetch(
          MOE_API +
          "/v1/signals/open",
          {
            headers:{
              "Accept":
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

        signalSource =
          "/v1/signals/open";

      }

    }

    catch(error) {

      console.log(
        "v1 open endpoint failed:",
        error.message
      );

    }

    /*
      If the v1 endpoint did not
      return an array,
      try the standard /signals endpoint.
    */

    if (
      !signalSource
    ) {

      const standardResponse =
        await fetch(
          MOE_API +
          "/signals",
          {
            headers:{
              "Accept":
              "application/json"
            }
          }
        );

      if (
        standardResponse.ok
      ) {

        const standardData =
          await standardResponse.json();

        const allSignals =
          extractSignals(
            standardData
          );

        /*
          Keep only currently open
          signals when possible.
        */

        signals =
          allSignals.filter(
            signal => {

              const status =
                String(
                  signal.status ||
                  ""
                )
                .toUpperCase();

              return (
                status === "OPEN"
                ||
                status === "ACTIVE"
                ||
                status === "ENTERED"
                ||
                status === ""
              );

            }
          );

        signalSource =
          "/signals";

      }

    }

    /*
      Try to retrieve stats as well.
      The frontend does not depend
      on this succeeding.
    */

    let stats =
      null;

    try {

      const statsResponse =
        await fetch(
          MOE_API +
          "/stats",
          {
            headers:{
              "Accept":
              "application/json"
            }
          }
        );

      if (
        statsResponse.ok
      ) {

        stats =
          await statsResponse.json();

      }

    }

    catch(error) {

      console.log(
        "stats request failed:",
        error.message
      );

    }

    return response
    .status(200)
    .json({

      ok:true,

      service:"Moe AI",

      source:
        signalSource,

      signals:
        Array.isArray(
          signals
        )
        ?
        signals
        :
        [],

      stats:
        stats,

      updated_at:
        new Date()
        .toISOString()

    });

  }

  catch(error) {

    console.error(
      "Moe AI proxy error:",
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
    data.results &&
    Array.isArray(
      data.results
    )
  ) {

    return data.results;

  }

  return [];

}
