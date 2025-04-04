/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-09-03T12:09:39+02:00
 * @Copyright: Technology Studio
**/

import { Log } from '@txo/log'

const log = new Log('@txo-peer-dep.error-handler.Api.ErrorHandlerManager')

type ErrorListener = (error: unknown) => void

let errorListenerList: ErrorListener[] = []

class FatalError extends Error { }

export const reportError = (error: unknown): void => {
  if (error instanceof FatalError) {
    return
  }
  log.debug('REPORT ERROR', error)
  const listenerErrorList: unknown[] = []
  for (const errorListener of errorListenerList) {
    try {
      errorListener(error)
    } catch (error) {
      listenerErrorList.push(error)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- check if listenerErrorList is empty
  if (listenerErrorList.length > 0) {
    listenerErrorList.push(error)
    throw new FatalError('FATAL ERROR: Dispatching to error listeners has failed', {
      cause: listenerErrorList,
    })
  }
}
export const subscribeErrorListener = (errorListener: ErrorListener) => {
  errorListenerList.push(errorListener)
  return () => {
    errorListenerList = errorListenerList.filter(listener => listener !== errorListener)
  }
}

export const delayedSubscribeErrorListener = (): typeof subscribeErrorListener => {
  const errorQueue: unknown[] = []
  let _errorListener: ErrorListener | undefined = undefined

  subscribeErrorListener((error) => {
    if (_errorListener != null) {
      _errorListener(error)
    } else {
      errorQueue.push(error)
    }
  })

  const unsubscribeErrorListener = (): void => {
    _errorListener = undefined
  }

  return (errorListener: ErrorListener) => {
    if (_errorListener === errorListener) {
      return unsubscribeErrorListener
    }
    if (_errorListener != null) {
      throw new Error('Error listener already subscribed')
    }
    _errorListener = errorListener

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- report queued errors
    while (errorQueue.length > 0) {
      errorListener(errorQueue.shift())
    }

    return unsubscribeErrorListener
  }
}
