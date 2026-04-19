import { describe, it, expect } from 'vitest'
import { mapTerraToWearableSync } from '../../terra/mapping'
import activityFixture from './fixtures/activity-data.json'
import sleepFixture from './fixtures/sleep-data.json'
import dailyFixture from './fixtures/daily-data.json'

describe('terra/mapping — mapTerraToWearableSync', () => {
  it('maps activity fixture → steps + heartRate', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: activityFixture },
      'garmin',
    )
    expect(result).toHaveLength(1)
    expect(result[0].steps).toBe(9420)
    expect(result[0].heartRate).toBeCloseTo(68.5)
    expect(result[0].date.toISOString().startsWith('2026-04-18')).toBe(true)
  })

  it('maps sleep fixture → sleepHours', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'sleep', payload: sleepFixture },
      'oura',
    )
    expect(result).toHaveLength(1)
    expect(result[0].sleepHours).toBeCloseTo(7, 1)
  })

  it('maps daily fixture → recoveryScore, hrv, readiness', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'daily', payload: dailyFixture },
      'oura',
    )
    expect(result).toHaveLength(1)
    expect(result[0].recoveryScore).toBe(82)
    expect(result[0].readiness).toBe(78)
    expect(result[0].hrv).toBeCloseTo(46.2)
  })

  it('returns [] for empty data array', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: { data: [] } },
      'oura',
    )
    expect(result).toEqual([])
  })

  it('returns [] when payload has no data field', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: { foo: 'bar' } },
      'oura',
    )
    expect(result).toEqual([])
  })

  it('handles multi-day payload → array with N entries', () => {
    const multi = {
      data: [
        { metadata: { start_time: '2026-04-17T00:00:00Z' }, distance_data: { steps: 5000 } },
        { metadata: { start_time: '2026-04-18T00:00:00Z' }, distance_data: { steps: 7000 } },
      ],
    }
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: multi },
      'garmin',
    )
    expect(result).toHaveLength(2)
    expect(result[0].steps).toBe(5000)
    expect(result[1].steps).toBe(7000)
  })

  it('ignores entries without start_time metadata', () => {
    const result = mapTerraToWearableSync(
      {
        type: 'data',
        terraUserId: 'tu1',
        dataType: 'activity',
        payload: { data: [{ distance_data: { steps: 100 } }] },
      },
      'oura',
    )
    expect(result).toEqual([])
  })
})
