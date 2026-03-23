import splashGif from '../assets/Splash/splash.gif';


const LogoSplash = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor:'#FFFFFF'
        }}
      >
        <img
          src= {splashGif} // Use a public folder path
          alt="Splash Screen"
          style={{ width: '300px', height: 'auto' }}
        />
      </div>
    );
  };
  
  export default LogoSplash;
  