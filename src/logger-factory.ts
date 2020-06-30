import winston from 'winston';


function createLogger() {
  return winston.createLogger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({filename: 'suricate.log'})
    ],
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
  });
}

export {
  createLogger
}