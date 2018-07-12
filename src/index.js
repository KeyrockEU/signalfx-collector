const { groupBy } = require('lodash')

const { sum, avg, percentile } = require('./arithmetic')

// For a given metric, returns a unique string. Useful to detect same metrics with different values
function hashMetric (m) {
  return `${m.metric}: ${JSON.stringify(m.dimensions)}`
}

module.exports.SignalFxCollector = function SignalFxCollector ({ basicDimensions, resolution = 60000, client }) {
  let gauges = []
  let counters = []

  // Takes a metric and aggregates them applying the function `fn` to the `value` field.
  function aggregateMetrics (suffix, groupedMetrics, fn) {
    return Object.entries(groupedMetrics).reduce((result, [, metrics]) => ([
      ...result,
      {
        metric: `${metrics[0].metric}_${suffix}`,
        dimensions: Object.assign({}, basicDimensions, metrics[0].dimensions),
        value: fn(metrics.map(m => m.value))
      }
    ]), [])
  }

  function flush () {
    const gaugesByMetric = groupBy(gauges, hashMetric)
    gauges = []

    const countersByMetric = groupBy(counters, hashMetric)
    counters = []

    const payload = {
      counters: aggregateMetrics('count', countersByMetric, sum),
      gauges: [
        ...aggregateMetrics('average', gaugesByMetric, avg),
        ...aggregateMetrics('p95', gaugesByMetric, percentile(95)),
        ...aggregateMetrics('median', gaugesByMetric, percentile(50))
      ]
    }

    // Note that if this operation fails, the gauges and counter are already cleared. The clean is
    // done before metrics aggregation in order to be more performant and avoid race conditions.
    // Maybe in the future we may want to add some error mechanism.
    client.send(payload)
  }

  // Flush data periodically
  setInterval(flush, resolution)

  return {
    counter (metric, value, dimensions) {
      counters.push({ metric, value, dimensions })
    },

    gauge (metric, value, dimensions) {
      gauges.push({ metric, value, dimensions })
    }
  }
}
