import React, { useMemo, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import { tokens } from '../theme';
import { LEVELS, YORK_RED, DEFAULT_DEMO } from '../crowd/config';
import { buildForecast, formatHour } from '../crowd/forecast';
import DemoControls from './DemoControls';

/**
 * Tait McKenzie Crowd Forecast — a display-only prototype tab.
 *
 * Data logic lives in /src/crowd (config.js + forecast.js). This component
 * owns the demo state, derives the forecast via buildForecast(), and renders
 * the student-facing view. The Demo Controls panel is clearly separated and
 * labelled testing-only.
 *
 * All occupancy numbers are simulated. The prototype never claims to show
 * actual live gym conditions.
 */

function LevelBadge({ level, id }) {
  const meta = LEVELS[level];
  return (
    <Chip
      id={id}
      label={meta.label}
      size="small"
      sx={{
        backgroundColor: `${meta.color}22`,
        color: meta.color,
        border: `1px solid ${meta.color}`,
        fontWeight: 700,
        fontFamily: '"Space Grotesk", sans-serif',
        letterSpacing: '0.06em',
        '& .MuiChip-label': { px: 1.25 },
      }}
    />
  );
}

function ForecastBar({ interval, index }) {
  const meta = LEVELS[interval.level];
  const barWidth = Math.max(2, interval.percent); // keep a sliver visible at 0%
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        py: 0.75,
      }}
    >
      {/* Hour label */}
      <Typography
        sx={{
          width: { xs: 92, sm: 120 },
          flexShrink: 0,
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          color: 'text.secondary',
        }}
      >
        {interval.label}
      </Typography>

      {/* Bar track */}
      <Box
        sx={{
          flex: 1,
          height: 22,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 1.5,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          role="img"
          aria-label={`${interval.label}: ${interval.percent}% occupancy, ${meta.label}`}
          sx={{
            width: `${barWidth}%`,
            height: '100%',
            backgroundColor: meta.color,
            borderRadius: 1.5,
            transition: 'width 0.4s ease',
          }}
        />
      </Box>

      {/* Percentage + badge */}
      <Box
        sx={{
          width: { xs: 120, sm: 150 },
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: { xs: '0.8rem', sm: '0.9rem' },
            fontWeight: 600,
            color: 'text.primary',
            minWidth: 42,
            textAlign: 'right',
          }}
        >
          {interval.percent}%
        </Typography>
        <LevelBadge level={interval.level} id={`forecast-badge-${index}`} />
      </Box>
    </Box>
  );
}

export default function CrowdForecast() {
  const [demo, setDemo] = useState({ ...DEFAULT_DEMO });

  const handleDemoChange = useCallback((next) => setDemo(next), []);
  const handleReset = useCallback(() => setDemo({ ...DEFAULT_DEMO }), []);

  const model = useMemo(
    () =>
      buildForecast({
        dateStr: demo.date,
        timeStr: demo.time,
        liveAvailable: demo.liveAvailable,
        baselineAvailable: demo.baselineAvailable,
        closureDates: demo.closureDates,
        override: demo.override,
      }),
    [demo]
  );

  const lastUpdatedText = model.lastUpdated
    ? model.lastUpdated.toLocaleString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 3 }}>
      {/* Page title */}
      <Typography variant="h5" sx={{ fontSize: '1.25rem', mb: 0.5 }} id="crowd-forecast-title">
        Tait McKenzie Crowd Forecast
      </Typography>

      {/* Always-visible prototype disclaimer */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
        Prototype: simulated occupancy data, not actual live gym conditions.
      </Typography>

      {/* No-data state */}
      {model.noData && (
        <Alert severity="warning" id="crowd-forecast-unavailable" sx={{ mb: 2 }}>
          <AlertTitle>Forecast unavailable.</AlertTitle>
          Both simulated live and historical-baseline data are offline. No occupancy
          estimates are available right now.
        </Alert>
      )}

      {/* Closed state */}
      {model.closed && (
        <Card id="crowd-forecast-closed" sx={{ mb: 2 }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <AccessTimeIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Closed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {model.closure
                ? `${demo.date} is an exceptional facility closure. No occupancy forecast is available.`
                : 'The facility is outside its demo operating hours.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
              Demo hours: Mon–Fri 06:00–23:00, Sat–Sun 08:00–20:00.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Open + data available */}
      {!model.closed && !model.noData && model.current && (
        <>
          {/* Historical-only banner */}
          {model.banner && (
            <Alert severity="info" id="crowd-forecast-banner" sx={{ mb: 2 }}>
              {model.banner}
            </Alert>
          )}

          {/* Current status card */}
          <Card id="crowd-forecast-current" sx={{ mb: 2 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PeopleIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                    <Typography variant="subtitle1" sx={{ fontSize: '0.8rem' }}>
                      Estimated current occupancy
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography
                      sx={{
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontSize: '3rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        color: 'text.primary',
                      }}
                      aria-label={`Current occupancy ${model.current.percent} percent, ${LEVELS[model.current.level].label}`}
                    >
                      {model.current.percent}%
                    </Typography>
                    <LevelBadge level={model.current.level} id="current-level-badge" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
                    {model.current.source === 'override'
                      ? 'Value set by demo override.'
                      : model.current.source === 'live'
                      ? 'Simulated live estimate.'
                      : 'Historical baseline estimate (not confirmed live occupancy).'}
                  </Typography>
                </Box>

                {/* Last-updated + freshness note */}
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  {lastUpdatedText && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Last updated {lastUpdatedText}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', mt: 0.5, maxWidth: 260 }}
                  >
                    In production, the forecast refreshes hourly.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* 8-hour forecast */}
          {model.forecast.length > 0 && (
            <Card id="crowd-forecast-hours">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontSize: '0.8rem', mb: 2 }}>
                  Up to 8-hour forecast
                </Typography>
                <Box role="list" aria-label="Hourly occupancy forecast">
                  {model.forecast.map((interval, i) => (
                    <Box role="listitem" key={interval.label}>
                      <ForecastBar interval={interval} index={i} />
                    </Box>
                  ))}
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, fontSize: '0.72rem' }}
                >
                  Bars stop at the facility&apos;s demo closing hour
                  {model.forecast.length < 8 ? ` (${model.forecast.length} interval${model.forecast.length === 1 ? '' : 's'} shown)` : ''}.
                  Percentages are historical-baseline estimates, not confirmed live occupancy.
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Testing-only demo controls — visually separated */}
      <DemoControls state={demo} onChange={handleDemoChange} onReset={handleReset} />
    </Box>
  );
}
