const gauge = {
  centerX: 160,
  centerY: 150,
  radius: 102,
  valueTopY: 190
};

const failures = [];

for (let score = 0; score <= 100; score += 1) {
  const angle = -90 + score * 1.8;
  const needle = gaugeNeedlePoints(gauge.centerX, gauge.centerY, gauge.radius, angle);
  const needleMaxY = Math.max(
    gauge.centerY,
    needle.tip.y,
    needle.stemEnd.y,
    needle.left.y,
    needle.right.y
  );

  if (needleMaxY >= gauge.valueTopY) {
    failures.push({ score, needleMaxY });
  }
}

if (failures.length) {
  console.error("Gauge needle can overlap the score value:", failures);
  process.exit(1);
}

console.log("Gauge layout check passed for scores 0-100.");

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: roundSvgNumber(cx + radius * Math.cos(angleInRadians)),
    y: roundSvgNumber(cy + radius * Math.sin(angleInRadians))
  };
}

function gaugeNeedlePoints(cx, cy, radius, angleInDegrees) {
  const tip = polarToCartesian(cx, cy, radius, angleInDegrees);
  const stemEnd = polarToCartesian(cx, cy, radius - 16, angleInDegrees);
  const base = polarToCartesian(cx, cy, radius - 20, angleInDegrees);
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  const perpendicularX = -Math.sin(radians);
  const perpendicularY = Math.cos(radians);
  const halfWidth = 7;

  return {
    tip,
    stemEnd,
    left: {
      x: roundSvgNumber(base.x + perpendicularX * halfWidth),
      y: roundSvgNumber(base.y + perpendicularY * halfWidth)
    },
    right: {
      x: roundSvgNumber(base.x - perpendicularX * halfWidth),
      y: roundSvgNumber(base.y - perpendicularY * halfWidth)
    }
  };
}

function roundSvgNumber(value) {
  return Math.round(value * 10) / 10;
}
