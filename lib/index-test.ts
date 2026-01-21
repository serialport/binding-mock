import { MockBinding } from '.'
import { OpenOptions } from '@serialport/bindings-interface'
import { assert } from 'chai'

export const shouldReject = async (promise: Promise<unknown>, errType = Error, message = 'Should have rejected') => {
  try {
    await promise
  } catch (err) {
    assert.instanceOf(err, errType)
    return err
  }
  throw new Error(message)
}

const openOptions: OpenOptions = {
  path: '/dev/exists',
  baudRate: 9600,
  dataBits: 8,
  lock: false,
  stopBits: 1,
  parity: 'none',
  rtscts: false,
  xon: false,
  xoff: false,
  xany: false,
  hupcl: false,
}

describe('MockBinding', () => {
  beforeEach(() => {
    MockBinding.reset()
  })

  describe('instance method', () => {
    describe('open', () => {
      describe('when phony port not created', () => {
        it('should reject', async () => {
          await shouldReject(MockBinding.open(openOptions))
        })
      })

      describe('when phony port created', () => {
        beforeEach(() => {
          MockBinding.createPort('/dev/exists')
        })

        it('should open the phony port', async () => {
          const port = await MockBinding.open(openOptions)
          assert.isTrue(port.isOpen)
        })

        it('should have a "port" prop with "info.serialNumber" prop', async () => {
          const port = await MockBinding.open(openOptions)
          assert.strictEqual(port.port.info.serialNumber, '1')
        })
      })
    })
  })

  describe('static method', () => {
    describe('createPort', () => {
      it('should increment the serialNumber', async () => {
        MockBinding.createPort('/dev/exists')
        MockBinding.createPort('/dev/ttyUSB1')
        const port1 = await MockBinding.open(openOptions)
        const port2 = await MockBinding.open({ ...openOptions, path: '/dev/ttyUSB1' })
        assert.strictEqual(port1.port.info.serialNumber, '1')
        assert.strictEqual(port2.port.info.serialNumber, '2')
      })
    })
    describe('reset', () => {
      beforeEach(async () => {
        MockBinding.createPort('/dev/exists')
        const port = await MockBinding.open(openOptions)
        assert.strictEqual(port.port?.info.serialNumber, '1')
        await port.close()
      })

      it('should delete any configured phony ports', async () => {
        MockBinding.reset()
        await shouldReject(MockBinding.open(openOptions))
      })

      it('should reset the serialNumber assigned to the phony port', async () => {
        MockBinding.reset()
        MockBinding.createPort('/dev/exists')
        const port = await MockBinding.open(openOptions)
        assert.strictEqual(port.port.info.serialNumber, '1')
      })
    })
    describe('getOpenMockPort', () => {
      beforeEach(async () => {
        MockBinding.reset()
      })

      it('should return a value for an existing open port', async () => {
        MockBinding.createPort('/dev/exists')
        await MockBinding.open(openOptions)
        const openPort = MockBinding.getOpenMockPort('/dev/exists')
        assert.strictEqual(openPort.port.info.serialNumber, '1')
      })

      it('should return undefined for an unknown port path', async () => {
        const openPort = MockBinding.getOpenMockPort('/dev/unknown')
        assert.strictEqual(openPort, undefined)
      })

      it('should return undefined for an existing port that is not open', async () => {
        MockBinding.createPort('/dev/exists')
        const openPort = MockBinding.getOpenMockPort('/dev/exists')
        assert.strictEqual(openPort, undefined)
      })
    })
  })
})

describe('MockPortBinding', () => {
  beforeEach(() => {
    MockBinding.reset()
  })

  describe('instance property', () => {
    describe('writeToPort', () => {
      it('can send data from one port to another', async () => {
        MockBinding.createPort('/dev/exists')
        const port1 = await MockBinding.open(openOptions)
        const port2 = await MockBinding.open(openOptions)
        port1.writeToPort = port2

        const message = Buffer.from('MSG')
        await port1.write(message)
        const receivingBuffer = Buffer.alloc(message.length)
        await port2.read(receivingBuffer, 0, message.length)
        assert.isTrue(receivingBuffer.equals(message))
      })
    })
  })
})
