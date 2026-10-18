import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ScienceIcon from '@mui/icons-material/Science';
import { tokens } from '../theme';
import { DEFAULT_DEMO } from '../crowd/config';

/**
 * Demo Controls — a clearly labelled TESTING-ONLY panel for the Crowd
 * Forecast prototype. Lets a grader reproduce all eight mandatory test
 * states without touching production data.
 *
 * The panel is visually separated from the student-facing forecast and
 * labelled "Testing only". It manipulates the demo state passed in from
 * the parent; it never mutates the forecast model directly.
 */
export default function DemoControls({ state, onChange, onReset }) {
  const [overrideInput, setOverrideInput] = useState(
    state.override === null || state.override === undefined ? '' : String(state.override)
  );
  const [overrideError, setOverrideError] = useState('');

  function update(patch) {
    onChange({ ...state, ...patch });
  }

  // --- Override validation -------------------------------------------------
  // Reject <0, >100, blank, and non-numeric. Never silently clamp.
  function commitOverride(raw) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      setOverrideError('');
      update({ override: null });
      return;
    }
    const num = Number(trimmed);
    if (trimmed === '' || Number.isNaN(num) || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      setOverrideError('Enter a number between 0 and 100.');
      return;
    }
    if (num < 0 || num > 100) {
      setOverrideError(`Value must be between 0 and 100 (you entered ${trimmed}).`);
      return;
    }
    setOverrideError('');
    // Preserve decimals (e.g. 39.9, 75.1) — do NOT round the stored value.
    update({ override: num });
  }

  function handleOverrideKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitOverride(overrideInput);
    }
  }

  function clearOverride() {
    setOverrideInput('');
    setOverrideError('');
    update({ override: null });
  }

  function toggleSelectedDateClosed() {
    const set = new Set(state.closureDates);
    if (set.has(state.date)) {
      set.delete(state.date);
    } else {
      set.add(state.date);
    }
    update({ closureDates: [...set].sort() });
  }

  const selectedIsClosed = state.closureDates.includes(state.date);

  return (
    <Card
      id="crowd-demo-controls"
      sx={{
        mt: 4,
        borderColor: tokens.accentBorder40,
        border: '1px dashed',
        backgroundColor: 'rgba(227,24,55,0.04)',
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Testing-only header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ScienceIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            Demo Controls
          </Typography>
          <Chip
            label="Testing only"
            size="small"
            color="error"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20, letterSpacing: '0.08em' }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: -0.5 }}>
          These controls simulate conditions for grading. They are not part of the
          student-facing forecast.
        </Typography>

        <Divider />

        {/* Date + time */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Simulated date"
            type="date"
            value={state.date}
            onChange={(e) => update({ date: e.target.value })}
            fullWidth
            size="small"
            id="demo-date-input"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Simulated time"
            type="time"
            value={state.time}
            onChange={(e) => update({ time: e.target.value })}
            fullWidth
            size="small"
            id="demo-time-input"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        {/* Availability toggles */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={state.liveAvailable}
                onChange={(e) => update({ liveAvailable: e.target.checked })}
                id="demo-live-toggle"
                inputProps={{ 'aria-label': 'Simulated live data available' }}
              />
            }
            label="Live data available"
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.baselineAvailable}
                onChange={(e) => update({ baselineAvailable: e.target.checked })}
                id="demo-baseline-toggle"
                inputProps={{ 'aria-label': 'Historical baseline available' }}
              />
            }
            label="Historical baseline available"
          />
        </Stack>

        {/* Closure toggle for the selected date */}
        <Box>
          <Button
            variant={selectedIsClosed ? 'contained' : 'outlined'}
            color="error"
            size="small"
            onClick={toggleSelectedDateClosed}
            id="demo-toggle-closure-button"
          >
            {selectedIsClosed
              ? `Unmark ${state.date} as closed`
              : `Mark ${state.date} as closed`}
          </Button>
          {state.closureDates.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {state.closureDates.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              ))}
            </Box>
          )}
        </Box>

        <Divider />

        {/* Occupancy override */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
            Occupancy override (%) — decimals allowed (e.g. 39.9, 75.1)
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
            <TextField
              label="Override %"
              type="text"
              inputMode="decimal"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              onBlur={() => commitOverride(overrideInput)}
              onKeyDown={handleOverrideKey}
              placeholder="0–100"
              size="small"
              id="demo-override-input"
              error={Boolean(overrideError)}
              helperText={overrideError || 'Blank or cleared = use the mock model.'}
              sx={{ maxWidth: 220 }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => commitOverride(overrideInput)}
                id="demo-override-apply"
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={clearOverride}
                id="demo-override-clear"
              >
                Clear
              </Button>
            </Stack>
          </Stack>
          {state.override !== null && state.override !== undefined && !overrideError && (
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem', color: 'primary.light' }}>
              Active override: {state.override}% (replaces the model value)
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Reset all */}
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RestartAltIcon />}
            onClick={() => {
              setOverrideInput('');
              setOverrideError('');
              onReset();
            }}
            id="demo-reset-button"
            size="small"
          >
            Reset All
          </Button>
        </Box>

        {/* Quick-reference: the 8 test cases */}
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1 }}
            color="text.secondary"
          >
            Test cases
          </Typography>
          <Box component="ol" sx={{ pl: 2.5, m: 0, fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.7 }}>
            <li>Weekday 10:00, live on — card + 8 bars.</li>
            <li>Fri 23:30 — Closed.</li>
            <li>Fri 21:00 — exactly 2 intervals.</li>
            <li>Sat 10:00 — weekend curve.</li>
            <li>Live off, baseline on — historical banner.</li>
            <li>Live off, baseline off — unavailable.</li>
            <li>Weekday 14:00 on a closure date — Closed.</li>
            <li>Overrides 39.9 / 40 / 75 / 75.1 — Low / Medium / Medium / High.</li>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
