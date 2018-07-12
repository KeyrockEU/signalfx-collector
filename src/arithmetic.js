const { sortBy } = require('lodash')

function sum (nums) {
  return nums.reduce((total, n) => total + n, 0)
}

function avg (nums = []) {
  if (nums.length === 0) {
    return 0
  }

  return sum(nums) / nums.length
}

function percentile (n) {
  const factor = 1 - (n / 100)
  return function p (nums = []) {
    if (nums.length === 0) {
      return 0
    }

    const index = nums.length - Math.floor(nums.length * factor) - 1
    return sortBy(nums)[index]
  }
}

module.exports = {
  sum,
  avg,
  percentile
}
