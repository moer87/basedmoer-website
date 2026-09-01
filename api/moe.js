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
        MOE_API + "/health",
        {
          headers:{
            Accept:
              "application/json"
          }
        }
      );

    if(
      !healthResponse.ok
    ){

      throw new Error(
        "Moer AI health check failed"
      );

    }

    let signals =
      [];

    let source =
      null;

    try{

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

      if(
        openResponse.ok
      ){

        const data =
          await openResponse.json();

        signals =
          extractSignals(
            data
          );

        source =
          "/v1/signals/open";

      }

    }

    catch(error){

      console.log(
        "v1 endpoint unavailable:",
        error.message
      );

    }

    if(
      !source
    ){

      const standardResponse =
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

      if(
        standardResponse.ok
      ){

        const data =
          await standardResponse.json();

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
                status === "OPEN" ||
                status === "ACTIVE" ||
                status === "ENTERED"
              );

            }
          );

        source =
          "/signals";

      }

    }

    let stats =
      null;

    try{

      const statsResponse =
        await fetch(
          MOE_API +
          "/stats",
          {
            headers:{
              Accept:
                "application/json"
            }
          }
        );

      if(
        statsResponse.ok
      ){

        stats =
          await statsResponse.json();

      }

    }

    catch(error){

      console.log(
        "Stats unavailable:",
        error.message
      );

    }

    return response
    .status(200)
    .json({

      ok:true,

      service:
        "Moer AI",

      source,

      signals:
        Array.isArray(
          signals
        )
        ?
        signals
        :
        [],

      stats,

      updated_at:
        new Date()
        .toISOString()

    });

  }

  catch(error){

    console.error(
      "Moer AI proxy error:",
      error
    );

    return response
    .status(503)
    .json({

      ok:false,

      error:
        error.message ||
        "Unable to contact Moer AI"

    });

  }

};

function extractSignals(data){

  if(
    Array.isArray(
      data
    )
  ){
    return data;
  }

  if(
    data &&
    Array.isArray(
      data.signals
    )
  ){
    return data.signals;
  }

  if(
    data &&
    Array.isArray(
      data.data
    )
  ){
    return data.data;
  }

  if(
    data &&
    Array.isArray(
      data.results
    )
  ){
    return data.results;
  }

  return [];

}
