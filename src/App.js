import { Route } from 'react-router';
import Header from 'components/Header';
import { Switch } from 'react-router-dom';
import Login from 'pages/Login';
import Signup from 'pages/Signup';
import CreatePost from 'pages/CreatePost';
import Home from 'pages/Home';
import { useAuthUser } from 'lib/firebase';

export default function App() {
  useAuthUser();
  return (
    <>
      <Route component={Header} />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/createpost" component={CreatePost} />
        <Route path="/" component={Home} />
      </Switch>
    </>
  );
}
