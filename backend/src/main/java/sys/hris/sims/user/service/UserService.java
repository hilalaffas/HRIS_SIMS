package sys.hris.sims.user.service;

import java.util.List;

import org.springframework.stereotype.Service;

import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;


@Service
public class UserService {


private final UserRepository repo;


public UserService(UserRepository repo){

this.repo=repo;

}

public List<User> getAll(){

return repo.findAll();

}

public User save(User user){

return repo.save(user);

}


}