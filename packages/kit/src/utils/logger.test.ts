/**
 * Logger Tests
 */

import type { LogEntry } from './logger-types'
import { describe, expect, it, vi } from 'vitest'
import { createLogCollector } from './log-collector'
import { createNodeLogger } from './logger-node'

describe('createNodeLogger', () => {
  it('should create a logger with default options', () => {
    const logger = createNodeLogger()
    expect(logger).toBeDefined()
    expect(logger.info).toBeInstanceOf(Function)
    expect(logger.warn).toBeInstanceOf(Function)
    expect(logger.error).toBeInstanceOf(Function)
    expect(logger.debug).toBeInstanceOf(Function)
  })

  it('should respect log level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createNodeLogger({ level: 'warn' })

    logger.debug('debug message')
    logger.info('info message')

    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should call onLog callback for all levels', () => {
    const entries: LogEntry[] = []
    const logger = createNodeLogger({
      level: 'silent', // Don't output to console
      onLog: entry => entries.push(entry),
    })

    logger.debug('debug')
    logger.info('info')
    logger.warn('warn')
    logger.error('error')

    expect(entries).toHaveLength(4)
    expect(entries.map(e => e.level)).toEqual(['debug', 'info', 'warn', 'error'])
  })

  it('should create child logger with combined scope', () => {
    const entries: LogEntry[] = []
    const logger = createNodeLogger({
      scope: 'parent',
      level: 'silent',
      onLog: entry => entries.push(entry),
    })

    const child = logger.child('child')
    child.info('message')

    expect(entries[0].scope).toBe('parent:child')
  })

  it('should handle Error objects', () => {
    const entries: LogEntry[] = []
    const logger = createNodeLogger({
      level: 'silent',
      onLog: entry => entries.push(entry),
    })

    const error = new Error('test error')
    logger.error(error)

    expect(entries[0].message).toBe('test error')
    expect(entries[0].error).toBe(error)
  })

  it('should include metadata', () => {
    const entries: LogEntry[] = []
    const logger = createNodeLogger({
      level: 'silent',
      onLog: entry => entries.push(entry),
    })

    logger.info('message', { key: 'value' })

    expect(entries[0].meta).toEqual({ key: 'value' })
  })

  it('should allow changing log level at runtime', () => {
    const logger = createNodeLogger({ level: 'info' })

    expect(logger.getLevel()).toBe('info')

    logger.setLevel('debug')
    expect(logger.getLevel()).toBe('debug')
  })
})

describe('createLogCollector', () => {
  it('should collect log entries', () => {
    const collector = createLogCollector()

    collector.add({
      level: 'info',
      message: 'test',
      timestamp: Date.now(),
    })

    expect(collector.entries).toHaveLength(1)
  })

  it('should respect maxEntries limit', () => {
    const collector = createLogCollector({ maxEntries: 3 })

    for (let i = 0; i < 5; i++) {
      collector.add({
        level: 'info',
        message: `message ${i}`,
        timestamp: Date.now(),
      })
    }

    expect(collector.entries).toHaveLength(3)
    expect(collector.entries[0].message).toBe('message 2')
    expect(collector.entries[2].message).toBe('message 4')
  })

  it('should filter entries by level', () => {
    const collector = createLogCollector()

    collector.add({ level: 'debug', message: 'debug', timestamp: Date.now() })
    collector.add({ level: 'info', message: 'info', timestamp: Date.now() })
    collector.add({ level: 'warn', message: 'warn', timestamp: Date.now() })
    collector.add({ level: 'error', message: 'error', timestamp: Date.now() })

    const warnings = collector.getEntries({ level: 'warn' })
    expect(warnings).toHaveLength(2) // warn and error
  })

  it('should filter entries by scope', () => {
    const collector = createLogCollector()

    collector.add({ level: 'info', message: 'a', timestamp: Date.now(), scope: 'rpc' })
    collector.add({ level: 'info', message: 'b', timestamp: Date.now(), scope: 'rpc:call' })
    collector.add({ level: 'info', message: 'c', timestamp: Date.now(), scope: 'ws' })

    const rpcLogs = collector.getEntries({ scope: 'rpc' })
    expect(rpcLogs).toHaveLength(2)
  })

  it('should notify subscribers on add', () => {
    const collector = createLogCollector()
    const callback = vi.fn()

    collector.subscribe(callback)

    // Called immediately with current entries
    expect(callback).toHaveBeenCalledWith([])

    collector.add({ level: 'info', message: 'test', timestamp: Date.now() })

    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should allow unsubscribing', () => {
    const collector = createLogCollector()
    const callback = vi.fn()

    const unsubscribe = collector.subscribe(callback)
    unsubscribe()

    collector.add({ level: 'info', message: 'test', timestamp: Date.now() })

    // Only called once (initial call)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should clear all entries', () => {
    const collector = createLogCollector()

    collector.add({ level: 'info', message: 'test', timestamp: Date.now() })
    expect(collector.entries).toHaveLength(1)

    collector.clear()
    expect(collector.entries).toHaveLength(0)
  })
})
