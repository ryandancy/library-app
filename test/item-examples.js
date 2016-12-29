// TODO export unicode, whitespace, simple, etc.
// MARC records from https://www.loc.gov/marc/bibliographic/examples.html
// NOTE: the length fields in the leader are *wildly* inaccurate
// NOTE: there are no checkoutID fields in the examples
module.exports = [{
  marc: {
    leader: '05463nam  2200075 a 4500',
    fields: {
      control: [{
        tag: '001',
        value: '89187647889'
      }, {
        tag: '003',
        value: '87164'
      }, {
        tag: '005',
        value: '19920331092212.7'
      }, {
        tag: '007',
        value: 'ta'
      }, {
        tag: '008',
        value: '820305s1991    nyu           001 0 eng  '
      }],
      variable: [{
        tag: '020',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'a0845348116'
        }, {
          tag: 'c',
          value: '$29.95 (£19.50 U.K.)'
        }]
      }, {
        tag: '020',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '0845348205 (pbk.)'
        }]
      }, {
        tag: '040',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'EkG'
        }, {
          tag: 'c',
          value: 'OacTY'
        }]
      }, {
        tag: '050',
        ind1: '1',
        ind2: '4',
        subfields: [{
          tag: 'a',
          value: 'PN1992.8.S4'
        }, {
          tag: 'b',
          value: 'T47 1991'
        }]
      }, {
        tag: '082',
        ind1: '0',
        ind2: '4',
        subfields: [{
          tag: 'a',
          value: '791.45/75/0973'
        }, {
          tag: '2',
          value: '219'
        }]
      }, {
        tag: '100',
        ind1: '1',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Terrace, Vincent'
        }, {
          tag: 'd',
          value: '1948-'
        }]
      }, {
        tag: '245',
        ind1: '1',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Fifty years of television'
        }, {
          tag: 'b',
          value: 'a guide to series and pilots, 1937-1988'
        }, {
          tag: 'c',
          value: 'Vincent Terrace'
        }]
      }, {
        tag: '246',
        ind1: '1',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '50 years of television'
        }]
      }, {
        tag: '260',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'New York'
        }, {
          tag: 'b',
          value: 'Cornwall Books'
        }, {
          tag: 'c',
          value: 'c1991'
        }]
      }, {
        tag: '300',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '864 p.'
        }, {
          tag: 'c',
          value: '24 cm'
        }]
      }, {
        tag: '500',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Includes index'
        }]
      }, {
        tag: '650',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Television pilot programs'
        }, {
          tag: 'z',
          value: 'United States'
        }, {
          tag: 'v',
          value: 'Catalogs'
        }]
      }, {
        tag: '650',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Television serials'
        }, {
          tag: 'z',
          value: 'United States'
        }, {
          tag: 'v',
          value: 'Catalogs'
        }]
      }]
    }
  },
  barcode: 45871389531,
  status: 'in'
}, {
  marc: {
    leader: '09348cas  2200053 a 4500',
    fields: {
      control: [{
        tag: '001',
        value: '218974634621'
      }, {
        tag: '003',
        value: '1893'
      }, {
        tag: '005',
        value: '19920716101553.0'
      }, {
        tag: '008',
        value: '791031c19789999dcuar1        0   a0eng d'
      }],
      variable: [{
        tag: '010',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '   85649389 '
        }, {
          tag: 'z',
          value: 'sc 80000109 '
        }]
      }, {
        tag: '022',
        ind1: '0',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '0273-1967'
        }]
      }, {
        tag: '035',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '(OCoLC)5629434'
        }]
      }, {
        tag: '040',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'OeAA'
        }, {
          tag: 'c',
          value: 'EErsdK'
        }, {
          tag: 'd',
          value: 'JJE'
        }]
      }, {
        tag: '042',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'lc'
        }, {
          tag: 'a',
          value: 'nsdp'
        }]
      }, {
        tag: '043',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'n-us---'
        }]
      }, {
        tag: '050',
        ind1: '0',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'SK361'
        }, {
          tag: 'b',
          value: '.U63a'
        }]
      }, {
        tag: '082',
        ind1: '0',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: '639.9/2/0973'
        }, {
          tag: '2',
          value: '19'
        }]
      }, {
        tag: '210',
        ind1: '0',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Annu. wildl. fish. rep.'
        }]
      }, {
        tag: '222',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Annual wildlife an fisheries report'
        }]
      }, {
        tag: '245',
        ind1: '0',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Annual wildlife and fisheries report'
        }, {
          tag: 'c',
          value: 'United States Department of Agriculture, Forest Service, ' +
            'Wildlife and Fisheries'
        }]
      }, {
        tag: '246',
        ind1: '1',
        ind2: '4',
        subfields: [{
          tag: 'a',
          value: 'Wildlife and fish habitat management in the Forest Service'
        }]
      }, {
        tag: '260',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '[Washington, D.C.]'
        }, {
          tag: 'b',
          value: 'Wildlife and Fisheries'
        }]
      }, {
        tag: '300',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'v.'
        }, {
          tag: 'b',
          value: 'ill.'
        }, {
          tag: 'c',
          value: '28 cm'
        }]
      }, {
        tag: '310',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Annual'
        }]
      }, {
        tag: '362',
        ind1: '1',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Began with vol. for 1978'
        }]
      }, {
        tag: '500',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Description based on: 1983'
        }]
      }, {
        tag: '650',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Wildlife management'
        }, {
          tag: 'z',
          value: 'United States'
        }, {
          tag: 'v',
          value: 'Statistics'
        }, {
          tag: 'v',
          value: 'Periodicals'
        }]
      }, {
        tag: '650',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Wildlife management'
        }, {
          tag: 'z',
          value: 'United States'
        }, {
          tag: 'v',
          value: 'Periodicals'
        }]
      }, {
        tag: '650',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Wildlife habitat improvement'
        }, {
          tag: 'z',
          value: 'United States'
        }, {
          tag: 'v',
          value: 'Statistics'
        }, {
          tag: 'v',
          value: 'Periodicals'
        }]
      }, {
        tag: '650',
        ind1: ' ',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Wildlife habitat improvement'
        }, {
          tag: 'z',
          value: 'United States'
        }, {
          tag: 'v',
          value: 'Periodicals'
        }]
      }, {
        tag: '710',
        ind1: '1',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'United States'
        }, {
          tag: 'b',
          value: 'Forest Service'
        }, {
          tag: 'b',
          value: 'Wildlife and Fisheries Staff'
        }]
      }, {
        tag: '780',
        ind1: '0',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'United States. Forest Service. Division of Wildlife ' +
            'Management.'
        }, {
          tag: 't',
          value: 'Annual wildlife report'
        }, {
          tag: 'x',
          value: '0099-068X'
        }, {
          tag: 'w',
          value: '(OCoLC)224070'
        }, {
          tag: 'w',
          value: '(DLC)   75644790'
        }]
      }, {
        tag: '850',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'OeAA'
        }, {
          tag: 'a',
          value: 'EErsdK'
        }, {
          tag: 'a',
          value: 'JJE'
        }]
      }]
    }
  },
  barcode: 8913876178,
  status: 'out'
}, {
  marc: {
    leader: '76756cmm  2289781 a 4500',
    fields: {
      control: [{
        tag: '001',
        value: '9876548765'
      }, {
        tag: '003',
        value: '25314'
      }, {
        tag: '005',
        value: '19920401095900.0'
      }, {
        tag: '008',
        value: '870206s1985    miu        da       eng  '
      }],
      variable: [{
        tag: '040',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'DlaD'
        }, {
          tag: 'c',
          value: 'UoK'
        }]
      }, {
        tag: '100',
        ind1: '1',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Ashwell, Jonathan D.'
        }]
      }, {
        tag: '245',
        ind1: '1',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Bookends extended'
        }, {
          tag: 'h',
          value: '[electronic resource]'
        }, {
          tag: 'b',
          value: 'the reference management system'
        }]
      }, {
        tag: '250',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'V2.08'
        }]
      }, {
        tag: '260',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Birmingham, Mich.'
        }, {
          tag: 'b',
          value: 'Sensible Software'
        }, {
          tag: 'c',
          value: 'c1985'
        }]
      }, {
        tag: '300',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: '2 computer disks'
        }, {
          tag: 'c',
          value: '3 1/2-5 1/4 in.'
        }, {
          tag: 'e',
          value: '1 manual (107 p. ; 23 cm)'
        }]
      }, {
        tag: '500',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Copyright and manual by Jonathan D. Ashwell'
        }]
      }, {
        tag: '500',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Contents of disks are identical'
        }]
      }, {
        tag: '520',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Designed to save, retrieve, and format references, and to ' +
            'print bibliographies'
        }]
      }, {
        tag: '538',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'System requirements: Apple IIe with 80 column card or ' +
            'Apple IIc;128K; ProDOS; printer'
        }]
      }, {
        tag: '710',
        ind1: '2',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Sensible Software, Inc.'
        }]
      }, {
        tag: '753',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Apple IIe'
        }]
      }, {
        tag: '753',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Apple IIc'
        }]
      }]
    }
  },
  barcode: 983763193413,
  status: 'missing'
}, {
  marc: {
    leader: '98724caa  2288888 a 4500',
    fields: {
      control: [{
        tag: '001',
        value: '45678987654'
      }, {
        tag: '003',
        value: '918'
      }, {
        tag: '005',
        value: '19920504100110.5'
      }, {
        tag: '008',
        value: '860504s1977    mnua          000 0 eng d'
      }],
      variable: [{
        tag: '040',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'UoTbt'
        }, {
          tag: 'c',
          value: 'CLoP'
        }]
      }, {
        tag: '043',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'n-us---'
        }]
      }, {
        tag: '100',
        ind1: '1',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Nelson, Charles W.'
        }, {
          tag: 'q',
          value: '(Charles Winfred),'
        }, {
          tag: 'd',
          value: '1945-'
        }]
      }, {
        tag: '245',
        ind1: '1',
        ind2: '0',
        subfields: [{
          tag: 'a',
          value: 'Style theory of architecture in Minnesota'
        }, {
          tag: 'c',
          value: 'Charles W. Nelson'
        }]
      }, {
        tag: '300',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'p. 24-34, 36-37, 40-41'
        }, {
          tag: 'b',
          value: 'ill.'
        }, {
          tag: 'c',
          value: '29 cm'
        }]
      }, {
        tag: '500',
        ind1: ' ',
        ind2: ' ',
        subfields: [{
          tag: 'a',
          value: 'Title from caption.'
        }]
      }, {
        tag: '773',
        ind1: '0',
        ind2: ' ',
        subfields: [{
          tag: '7',
          value: 'nnas'
        }, {
          tag: 't',
          value: 'Architecture Minnesota'
        }, {
          tag: 'g',
          value: 'v. 4, no. 4 (July-Aug. 1977)'
        }, {
          tag: 'w',
          value: '(OCoLC)2253666'
        }]
      }]
    }
  },
  barcode: 876545678,
  status: 'in'
}];