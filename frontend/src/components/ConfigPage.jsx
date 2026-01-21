import { useState, useEffect } from 'react'
import axios from 'axios'
import { FaEye, FaEyeSlash, FaWallet, FaLock, FaChartLine, FaCoins, FaSave, FaDiscord } from 'react-icons/fa'
import { MdSettingsInputComponent } from 'react-icons/md'

import '../css/ConfigPage.css' 

function ConfigPage() {
  const [formData, setFormData] = useState({
    account_no: '',
    pin: '',
    trade_mode: 'AMOUNT',
    budget_per_trade: 0,
    fixed_volume: 0,
    discord_webhook_url: ''
  })
  const [status, setStatus] = useState(null)
  const [showPin, setShowPin] = useState(false)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/settings')
      setFormData(response.data)
    } catch (error) {
      console.error('Error:', error)
      setStatus({ type: 'danger', msg: 'Unable to connect to the server' })
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prevState => ({
      ...prevState,
      [name]: (name === 'budget_per_trade' || name === 'fixed_volume') 
              ? (value === '' ? '' : Number(value)) 
              : value
    }))
  }

  const handleBlurVolume = () => {
    let vol = Number(formData.fixed_volume)
    if (vol > 0 && vol % 100 !== 0) {
        const newVol = Math.round(vol / 100) * 100
        const finalVol = newVol < 100 ? 100 : newVol
        setFormData(prev => ({ ...prev, fixed_volume: finalVol }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ type: 'info', msg: 'Save in progress...' })
    try {
      await axios.post('http://localhost:8000/api/settings', formData)
      setStatus({ type: 'success', msg: 'Data successfully saved' })
      setTimeout(() => setStatus(null), 3000)
    } catch (error) {
      console.error('Error:', error)
      setStatus({ type: 'danger', msg: 'An error occurred during save' })
    }
  }

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          
          <div className="text-center mb-4">
            <h2 className="fw-bold text-primary">Configuration</h2>
          </div>

          <div className="card config-card">
            <div className="card-body p-4 p-md-5">
              
              {status && <div className={`alert alert-${status.type} shadow-sm border-0`}>{status.msg}</div>}

              <form onSubmit={handleSubmit}>
                {/* Account Details */}
                <h6 className="text-primary fw-bold mb-3 text-uppercase border-bottom pb-2">Account Details</h6>
                
                <div className="mb-3">
                  <label className="form-label text-muted fw-bold">Account No</label>
                  <div className="input-group">
                    <span className="input-group-text input-group-text-icon"><FaWallet className="text-primary"/></span>
                    <input type="text" className="form-control form-control-custom" name="account_no" value={formData.account_no} onChange={handleChange} required />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted fw-bold">PIN</label>
                  <div className="input-group">
                    <span className="input-group-text input-group-text-icon"><FaLock className="text-primary"/></span>
                    <input type={showPin ? "text" : "password"} className="form-control form-control-pin" name="pin" value={formData.pin} onChange={handleChange} required />
                    <button className="btn btn-eye" type="button" onClick={() => setShowPin(!showPin)}>
                      {showPin ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <h6 className="text-primary fw-bold mb-3 mt-4 text-uppercase border-bottom pb-2">
                  <FaDiscord className="me-2"/> Notification System
                </h6>

                <div className="mb-4">
                  <label className="form-label text-muted fw-bold">Discord Webhook URL</label>
                  <div className="input-group">
                    <span className="input-group-text bg-primary text-white border-end-0">
                      <FaDiscord />
                    </span>
                    <input 
                        type="text" 
                        className="form-control form-control-custom" 
                        name="discord_webhook_url" 
                        value={formData.discord_webhook_url || ''} 
                        onChange={handleChange} 
                        placeholder="https://discord.com/api/webhooks/..." 
                    />
                  </div>
                </div>

                {/* Trading Strategy */}
                <h6 className="text-primary fw-bold mb-3 mt-4 text-uppercase border-bottom pb-2">Trading Strategy</h6>

                <div className="mb-4">
                  <label className="form-label text-muted fw-bold">Trading Mode</label>
                  <div className="input-group">
                    <span className="input-group-text input-group-text-icon"><FaChartLine className="text-primary"/></span>
                    <select className="form-select trade-mode-select" name="trade_mode" value={formData.trade_mode} onChange={handleChange}>
                      <option value="AMOUNT">AMOUNT</option>
                      <option value="VOLUME">VOLUME</option>
                    </select>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className={`option-box ${formData.trade_mode === 'AMOUNT' ? 'active' : ''}`}>
                      <label className="form-label small fw-bold">Budget</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="budget_per_trade" 
                        value={formData.budget_per_trade} 
                        onChange={handleChange} 
                        disabled={formData.trade_mode !== 'AMOUNT'}
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className={`option-box ${formData.trade_mode === 'VOLUME' ? 'active' : ''}`}>
                      <label className="form-label small fw-bold">Volume</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="fixed_volume" 
                        value={formData.fixed_volume} 
                        onChange={handleChange} 
                        onBlur={handleBlurVolume}
                        step="100" 
                        disabled={formData.trade_mode !== 'VOLUME'}
                      />
                    </div>
                  </div>
                  
                </div>

                <div className="d-grid mt-5">
                  <button type="submit" className="btn btn-primary btn-save">
                    <FaSave className="me-2" /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfigPage