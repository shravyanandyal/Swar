import { NavLink } from "react-router-dom";
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic } from '@fortawesome/free-solid-svg-icons';

const Navigation = ({ web3Handler, account }) => {
    return (
        <Navbar expand="lg" style={{ backgroundColor: '#1db954' }}>
            <Container>
                <Navbar.Brand className="navbar-brand">
                    <FontAwesomeIcon icon={faMusic} className="music-icon" />
                    &nbsp; Swar
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={NavLink} exact to="/" activeClassName="active-nav">Home</Nav.Link>
                        <Nav.Link as={NavLink} to="/about" activeClassName="active-nav">About Swar</Nav.Link>
                        <Nav.Link as={NavLink} to="/forYou" activeClassName="active-nav">ForYou</Nav.Link>
                        <Nav.Link as={NavLink} to="/create" activeClassName="active-nav">Share Your Music</Nav.Link>
                        <Nav.Link as={NavLink} to="/NFT" activeClassName="active-nav">Browse NFTs</Nav.Link> 
                        <Nav.Link as={NavLink} to="/my-listed-items" activeClassName="active-nav">My Items</Nav.Link>
                        <Nav.Link as={NavLink} to="/my-purchases" activeClassName="active-nav">My Purchases</Nav.Link>
                        <Nav.Link as={NavLink} to="/MyRoyalty" activeClassName="active-nav">Royalty Earned</Nav.Link>
                        <Nav.Link as={NavLink} to="/Notifications" activeClassName="active-nav">Notifications</Nav.Link>
                    </Nav>
                    <Nav>
                        {account ? (
                            <Nav.Link
                                href={`https://etherscan.io/address/${account}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="button nav-button btn-sm mx-4">
                                <Button variant="outline-light">
                                    {account.slice(0, 5) + '...' + account.slice(38, 42)}
                                </Button>
                            </Nav.Link>
                        ) : (
                            <Button onClick={web3Handler} variant="outline-light">Connect Wallet</Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default Navigation;
