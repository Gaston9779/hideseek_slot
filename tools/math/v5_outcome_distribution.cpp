// Exhaustive V5 feature-spin distribution. Input is generated from the source
// strips by `node --import tsx -e ... > /private/tmp/skull-strips.json`.
#include <array>
#include <fstream>
#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;
struct W { array<int,3> a; int n, sc, cb; };
int id(const string&s){static map<string,int> m={{"WILD",0},{"SCATTER",1},{"CHEST_BONUS",2},{"MAGIC_BOOK",3},{"SKULL",4},{"BLASTER",5},{"GARGOYLE",6},{"CHEST",7},{"LANTERN",8},{"GHOST",9},{"TOMB",10},{"KEY",11},{"POTION",12}};return m[s];}
int pay(int s,int n){static int p[13][3]={{0},{0},{0},{64,254,1035},{46,180,729},{31,118,440},{20,73,292},{11,37,150},{8,27,106},{7,19,74},{5,14,53},{3,10,38},{3,9,30}};return n>=3?p[s][n-3]:0;}
int main(){ifstream f("/private/tmp/skull-strips.json");string z((istreambuf_iterator<char>(f)),{});auto at=z.find("\"FS_STRIPS\"");if(at==string::npos)return 2;vector<int>x;for(size_t i=at;i<z.size();){auto a=z.find('"',i);if(a==string::npos)break;auto b=z.find('"',a+1);if(b==string::npos)break;string s=z.substr(a+1,b-a-1);if(s!="FS_STRIPS"&&s!="BASE_STRIPS") {auto q=id(s);x.push_back(q);} i=b+1;}if(x.size()!=480){cerr<<"symbols="<<x.size()<<"\n";return 3;}vector<vector<W>> k(5);for(int r=0;r<5;r++){map<array<int,3>,int>m;for(int i=0;i<96;i++){array<int,3>a={x[r*96+(i+95)%96],x[r*96+i],x[r*96+(i+1)%96]};m[a]++;}for(auto &[a,n]:m){int sc=(a[0]==1)+(a[1]==1)+(a[2]==1),cb=(a[0]==2)+(a[1]==2)+(a[2]==2);k[r].push_back({a,n,sc,cb});}}
 int lines[20][5]={{1,1,1,1,1},{0,0,0,0,0},{2,2,2,2,2},{0,1,2,1,0},{2,1,0,1,2},{0,0,1,2,2},{2,2,1,0,0},{1,0,0,0,1},{1,2,2,2,1},{0,1,1,1,0},{2,1,1,1,2},{1,0,1,2,1},{1,2,1,0,1},{0,1,0,1,0},{2,1,2,1,2},{0,2,0,2,0},{2,0,2,0,2},{0,2,2,2,0},{2,0,0,0,2},{1,1,0,1,1}};map<array<int,3>,long long>h;long long cases=0;
 for(auto&a:k[0])for(auto&b:k[1])for(auto&c:k[2])for(auto&d:k[3])for(auto&e:k[4]){W*q[5]={&a,&b,&c,&d,&e};int u=0;for(auto&ln:lines){int lead=-1;for(int r=0;r<5;r++){int s=q[r]->a[ln[r]];if(s!=0){lead=s;break;}}if(lead<0||lead==1||lead==2)continue;int n=0,w=0;for(int r=0;r<5;r++){int s=q[r]->a[ln[r]];if(s==lead||s==0){n++;if(s==0)w++;}else break;}int p=pay(lead,n);u+=w?p*3:p;}int sc=a.sc+b.sc+c.sc+d.sc+e.sc,cb=a.cb+b.cb+c.cb+d.cb+e.cb;if(sc>=3)u+=(sc==3?3:sc==4?20:100)*20;h[{u,sc,cb}]+=(long long)a.n*b.n*c.n*d.n*e.n;cases++;}
 ofstream o("05-docs/data/v5_1/feature-spin-outcomes.tsv");o<<"units\tscatter\tchest\tcount\n";long long sum=0;for(auto &[q,n]:h){o<<q[0]<<'\t'<<q[1]<<'\t'<<q[2]<<'\t'<<n<<'\n';sum+=n;}cerr<<"cases="<<cases<<" rows="<<h.size()<<" sum="<<sum<<"\n";
}
