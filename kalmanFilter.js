// kalmanFilter.js
export default class KalmanFilter {
    constructor({ R = 0.01, Q = 2 } = {}) {
      this.R = R; // noise
      this.Q = Q; // process noise
      this.A = 1;
      this.B = 0;
      this.C = 1;
      this.cov = NaN;
      this.x = NaN;
    }
  
    filter(z) {
      if (isNaN(this.x)) {
        this.x = (1 / this.C) * z;
        this.cov = (1 / this.C) * this.Q * (1 / this.C);
      } else {
        // Prediction
        const predX = this.A * this.x;
        const predCov = this.A * this.cov * this.A + this.R;
  
        // Kalman Gain
        const K = predCov * this.C * (1 / (this.C * predCov * this.C + this.Q));
  
        // Correction
        this.x = predX + K * (z - this.C * predX);
        this.cov = predCov - K * this.C * predCov;
      }
  
      return this.x;
    }
  
    lastMeasurement() {
      return this.x;
    }
  }
  