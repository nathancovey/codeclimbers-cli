import { Injectable, Logger } from '@nestjs/common'
// eslint-disable-next-line import/no-unresolved
import * as path from 'node:path'
import { BIN_PATH, CODE_CLIMBER_META_DIR } from '../../../utils/node.util'
import { getServiceLib } from './startup.util'
import { isDev } from '../../../utils/environment.util'
const { Service } = getServiceLib()

@Injectable()
export class WindowsStartupService implements CodeClimbers.StartupService {
  private service: typeof Service

  constructor() {
    this.service = new Service({
      name: 'CodeClimbers',
      description: 'CodeClimbers service',
      script: `${path.join(BIN_PATH, 'startup.js')}`,
      logpath: CODE_CLIMBER_META_DIR,
      env: [
        {
          name: 'NODE_ENV',
          value: process.env.NODE_ENV || 'production',
        },
        {
          name: 'CODE_CLIMBER_BIN_PATH',
          value: BIN_PATH,
        },
      ],
      logOnAsUser: true,
      runAsAgent: true,
      wait: 5,
      grow: 0,
      maxRestarts: 10,
    })
    if (isDev()) {
      this.service.on('install', () => {
        Logger.debug(`${this.service.name.get} installed`)
      })

      this.service.on('alreadyinstalled', () => {
        Logger.debug(`${this.service.name} already installed`)
      })

      this.service.on('uninstall', () => {
        Logger.debug(`${this.service.name} uninstalled`)
      })

      this.service.on('start', () => {
        Logger.debug(`${this.service.name} started`)
      })

      this.service.on('stop', () => {
        Logger.debug(`${this.service.name} stopped`)
      })
    }
    this.service.on('error', (error) => {
      Logger.error(`${this.service.name} error:`, error)
    })
  }

  async enableStartup(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.service.install()
      this.service.on('install', () => {
        resolve()
      })
      this.service.on('alreadyinstalled', () => {
        resolve()
      })
      this.service.on('error', (error) => reject(error))
    })
  }

  async disableStartup(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.service.uninstall()
      this.service.on('uninstall', () => resolve())
      this.service.on('error', (error) => reject(error))
    })
  }

  async launchAndEnableStartup(): Promise<void> {
    await this.enableStartup()
    return new Promise((resolve, reject) => {
      this.service.start()
      this.service.on('start', () => resolve())
      this.service.on('error', (error) => reject(error))
    })
  }

  async closeAndDisableStartup(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.service.stop()
      this.service.on('stop', () => {
        this.disableStartup()
          .then(() => resolve())
          .catch((error) => reject(error))
      })
      this.service.on('error', (error) => reject(error))
    })
  }
}
