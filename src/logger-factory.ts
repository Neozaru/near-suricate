import winston from 'winston';


function createLoggerWithLabel(label: string) {
  return winston.createLogger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({filename: 'suricate.log'})
    ],
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `${info.timestamp} [${label}] ${info.level}: ${info.message}`)
    )
  });
}

export {
  createLoggerWithLabel
}