import { Component } from 'react'
export default class SceneBoundary extends Component {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error){console.warn('Optional scene unavailable:',error.message)}
  render(){return this.state.failed?this.props.fallback:this.props.children}
}
